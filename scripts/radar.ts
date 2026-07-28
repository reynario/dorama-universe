import { XMLParser } from 'fast-xml-parser'
import { matchNiche, normalize } from './lib/niche'
import { slugify } from './lib/text'

/**
 * RADAR DE PAUTAS - descobre o que esta em alta sobre dorama/k-pop e grava
 * na collection "leads" do Payload para o gerador de artigos consumir.
 *
 * Fontes (todas gratuitas):
 *   1. Google Trends "Em alta" Brasil (API + RSS)     -> termos explodindo agora
 *   2. Google News BR (RSS de busca por dorama/k-pop) -> o que a imprensa cobre
 *   3. Feeds internacionais (Soompi, Koreaboo, ...)   -> furos para adaptar ao BR
 *   4. Google Autocomplete (sementes do nicho)        -> o que as pessoas digitam
 *
 * Como rodar:
 *   pnpm payload run scripts/radar.ts          -> grava leads novos
 *   DRY=1 pnpm payload run scripts/radar.ts    -> so mostra o que encontraria
 *
 * Variaveis opcionais:
 *   MAX_LEADS=15   -> maximo de leads criados por execucao
 *   FRESH_HOURS=48 -> ignora noticias mais antigas que isso
 *   TRENDS_HOURS=48 -> janela da lista "em alta" do Trends (a API aceita ate ~168)
 *   LEAD_TTL_NEWS_DAYS=7     -> descarta pauta de noticia/trend pendente ha mais que isso
 *   LEAD_TTL_SUGGEST_DAYS=30 -> idem para pautas do Google Autocomplete (evergreen)
 */

const DRY = process.env.DRY === '1'
const MAX_LEADS = parseInt(process.env.MAX_LEADS || '15', 10)
const FRESH_HOURS = parseInt(process.env.FRESH_HOURS || '48', 10)
const TRENDS_HOURS = parseInt(process.env.TRENDS_HOURS || '48', 10)

const TRENDS_RSS = 'https://trends.google.com.br/trending/rss?geo=BR'

const GOOGLE_NEWS_QUERIES = ['dorama', 'k-drama', 'k-pop', 'drama coreano netflix']

const INTL_FEEDS: { url: string; outlet: string }[] = [
  { url: 'https://www.soompi.com/feed', outlet: 'Soompi' },
  { url: 'https://www.koreaboo.com/feed/', outlet: 'Koreaboo' },
  { url: 'https://www.dramabeans.com/feed/', outlet: 'Dramabeans' },
]

// Sementes digitadas no Google Autocomplete. As sugestoes devolvidas sao o que
// os leitores estao pesquisando de verdade (ex.: "dorama agente kim 2 temporada").
const AUTOCOMPLETE_SEEDS = [
  'dorama',
  'dorama onde assistir',
  'dorama final explicado',
  'dorama netflix',
  'dorama 2 temporada',
  'k-drama',
  'kdrama',
  'k-drama netflix',
  'k-pop',
  'comeback k-pop',
]

// ---------- tipos ----------
type Source = { url: string; title?: string; outlet?: string }

type Candidate = {
  topic: string
  topicKey: string
  kind: 'trend' | 'news'
  score: number
  matchedKeywords: string[]
  trafficVolume?: string
  sources: Source[]
}

// ---------- helpers ----------
function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return []
  return Array.isArray(x) ? x : [x]
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

async function fetchXml(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) {
      console.warn(`  [aviso] ${url} respondeu ${res.status}`)
      return null
    }
    return parser.parse(await res.text())
  } catch (err) {
    console.warn(`  [aviso] falha ao buscar ${url}: ${(err as Error).message}`)
    return null
  }
}

function isFresh(pubDate: string | undefined): boolean {
  if (!pubDate) return true
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return true
  return Date.now() - d.getTime() <= FRESH_HOURS * 3600_000
}

function parseTraffic(t: string | undefined): number {
  if (!t) return 0
  const digits = t.replace(/[^0-9]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function month(): string {
  return new Date().toISOString().slice(0, 7)
}

// Junta candidatos com a mesma chave (varios veiculos cobrindo o mesmo assunto).
function upsert(map: Map<string, Candidate>, c: Candidate) {
  const prev = map.get(c.topicKey)
  if (!prev) {
    map.set(c.topicKey, c)
    return
  }
  for (const s of c.sources) {
    if (!prev.sources.some((p) => p.url === s.url)) {
      prev.sources.push(s)
      prev.score += 8 // mais um veiculo falando do assunto = mais quente
    }
  }
  for (const k of c.matchedKeywords) {
    if (!prev.matchedKeywords.includes(k)) prev.matchedKeywords.push(k)
  }
  if (c.kind === 'trend' && prev.kind !== 'trend') {
    prev.kind = 'trend'
    prev.topic = c.topic
    prev.trafficVolume = c.trafficVolume
    prev.score += 30
  }
}

// ---------- 1. Google Trends "Em alta" (BR) ----------
// API interna da pagina "Em alta" nova. Aceita janela de ate ~168h e devolve
// centenas de termos, contra so os 10 do RSS (que fica como fallback). Cada
// item traz o termo, as noticias que o explicam e as buscas derivadas — tudo
// entra no matchNiche, entao um ator ou dorama e reconhecido mesmo quando o
// termo em alta sozinho e ambiguo.
// Nao e documentada; se o formato mudar, o radar cai para o RSS sem quebrar.
async function fetchTrendingApi(): Promise<any[] | null> {
  try {
    const body = new URLSearchParams({
      'f.req': JSON.stringify([
        [['i0OFE', JSON.stringify([null, null, 'BR', 3, 'pt-BR', TRENDS_HOURS, 1]), null, 'generic']],
      ]),
    })
    const res = await fetch(
      'https://trends.google.com/_/TrendsUi/data/batchexecute?rpcids=i0OFE&hl=pt-BR',
      {
        method: 'POST',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body,
        signal: AbortSignal.timeout(20_000),
      },
    )
    if (!res.ok) {
      console.warn(`  [aviso] API do Trends respondeu ${res.status}`)
      return null
    }
    const line = (await res.text()).split('\n').find((l) => l.includes('i0OFE'))
    if (!line) return null
    const items = JSON.parse(JSON.parse(line)[0][2])?.[1]
    return Array.isArray(items) && items.length > 0 ? items : null
  } catch (err) {
    console.warn(`  [aviso] API do Trends falhou: ${(err as Error).message}`)
    return null
  }
}

async function collectTrends(map: Map<string, Candidate>) {
  console.log(`1/4 Google Trends BR (em alta, ${TRENDS_HOURS}h)...`)
  const apiItems = await fetchTrendingApi()
  if (apiItems) {
    let hits = 0
    for (const item of apiItems) {
      const term = String(item?.[0] ?? '')
      if (!term) continue

      // [1] = noticias [titulo, url, veiculo, ...]; [6] = volume aproximado;
      // [9] = buscas derivadas do termo (ex.: "lovely runner 2 temporada")
      const news = asArray<any>(item?.[1])
      const derived = asArray<any>(item?.[9]).map((q) => String(q))

      // O proprio termo e do nicho (ator, dorama, grupo)? Aceita direto.
      // Senao, exige que 2+ noticias/buscas derivadas sejam do nicho — uma so
      // costuma ser mencao de passagem (ex.: "Lula cita doramas..." num termo
      // de politica), mas um dorama novo fora do vocabulario tem varias.
      const termMatch = matchNiche(term)
      const contextMatches = [...news.map((n) => String(n?.[0] ?? '')), ...derived]
        .map((t) => matchNiche(t))
        .filter((m) => m.matched)
      if (!termMatch.matched && contextMatches.length < 2) continue
      const match = termMatch.matched ? termMatch : contextMatches[0]
      for (const m of contextMatches) {
        for (const k of m.keywords) if (!match.keywords.includes(k)) match.keywords.push(k)
      }

      const volume = Number(item?.[6]) || 0
      const sources: Source[] = news.slice(0, 5).map((n) => ({
        url: String(n?.[1] ?? ''),
        title: String(n?.[0] ?? ''),
        outlet: String(n?.[2] ?? ''),
      }))
      if (sources.length === 0) {
        sources.push({
          url: `https://www.google.com/search?q=${encodeURIComponent(term)}`,
          title: term,
          outlet: 'Google Trends',
        })
      }

      upsert(map, {
        topic: term,
        topicKey: `trend-${slugify(term)}-${month()}`,
        kind: 'trend',
        // termo em alta no Trends e a pauta mais valiosa do radar
        score: 80 + Math.min(20, Math.round(Math.log10(Math.max(volume, 10)) * 5)),
        matchedKeywords: match.keywords,
        trafficVolume: volume ? `${volume.toLocaleString('pt-BR')}+` : undefined,
        sources,
      })
      hits++
    }
    console.log(`  ${apiItems.length} termos na API, ${hits} do nicho.`)
    return
  }

  console.log('  API indisponivel; usando RSS (top 10 nacional).')
  const xml = await fetchXml(TRENDS_RSS)
  const items = asArray<any>(xml?.rss?.channel?.item)
  let hits = 0

  for (const item of items) {
    const term: string = String(item.title ?? '')
    if (!term) continue

    const newsItems = asArray<any>(item['ht:news_item'])
    const newsText = newsItems.map((n) => String(n['ht:news_item_title'] ?? '')).join(' | ')
    const match = matchNiche(`${term} | ${newsText}`)
    if (!match.matched) continue

    const traffic = String(item['ht:approx_traffic'] ?? '')
    const volume = parseTraffic(traffic)
    const sources: Source[] = newsItems.slice(0, 5).map((n) => ({
      url: String(n['ht:news_item_url'] ?? ''),
      title: String(n['ht:news_item_title'] ?? ''),
      outlet: String(n['ht:news_item_source'] ?? ''),
    }))

    upsert(map, {
      topic: term,
      topicKey: `trend-${slugify(term)}-${month()}`,
      kind: 'trend',
      // termo em alta no Trends e a pauta mais valiosa do radar
      score: 80 + Math.min(20, Math.round(Math.log10(Math.max(volume, 10)) * 5)),
      matchedKeywords: match.keywords,
      trafficVolume: traffic || undefined,
      sources,
    })
    hits++
  }
  console.log(`  ${items.length} termos no feed, ${hits} do nicho.`)
}

// ---------- 2. Google News BR ----------
async function collectGoogleNews(map: Map<string, Candidate>) {
  console.log('2/4 Google News BR...')
  for (const q of GOOGLE_NEWS_QUERIES) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    const xml = await fetchXml(url)
    const items = asArray<any>(xml?.rss?.channel?.item)
    let hits = 0

    for (const item of items) {
      const title = String(item.title ?? '')
      const link = String(item.link ?? '')
      if (!title || !link || !isFresh(item.pubDate)) continue

      const match = matchNiche(title)
      if (!match.matched) continue

      const outlet = String(item.source?.['#text'] ?? item.source ?? '')
      // agrupa por entidade+dia (varios veiculos, mesmo assunto);
      // sem entidade identificada, agrupa pelo proprio titulo
      const topicKey = match.entity
        ? `${slugify(match.entity)}-${today()}`
        : slugify(title).slice(0, 60)

      const ageH = item.pubDate
        ? (Date.now() - new Date(item.pubDate).getTime()) / 3600_000
        : 24
      upsert(map, {
        topic: title.replace(/\s+-\s+[^-]+$/, ''), // remove " - Veiculo" do fim
        topicKey,
        kind: 'news',
        score: 30 + (ageH <= 12 ? 10 : 0),
        matchedKeywords: match.keywords,
        sources: [{ url: link, title, outlet }],
      })
      hits++
    }
    console.log(`  "${q}": ${items.length} itens, ${hits} aproveitados.`)
  }
}

// ---------- 3. Feeds internacionais ----------
async function collectIntlFeeds(map: Map<string, Candidate>) {
  console.log('3/4 Feeds internacionais...')
  for (const feed of INTL_FEEDS) {
    const xml = await fetchXml(feed.url)
    const items = asArray<any>(xml?.rss?.channel?.item)
    let hits = 0

    for (const item of items) {
      const title = String(item.title ?? '')
      const link = String(item.link ?? '')
      if (!title || !link || !isFresh(item.pubDate)) continue

      // O feed inteiro e do nicho; o matchNiche aqui serve para identificar a
      // entidade (agrupar com noticias BR) e priorizar nomes conhecidos.
      const match = matchNiche(title)
      const topicKey = match.entity
        ? `${slugify(match.entity)}-${today()}`
        : slugify(title).slice(0, 60)

      upsert(map, {
        topic: title,
        topicKey,
        kind: 'news',
        // furo internacional: bonus se cita entidade conhecida no BR
        score: 20 + (match.entity ? 15 : 0),
        matchedKeywords: match.keywords.length ? match.keywords : ['feed internacional'],
        sources: [{ url: link, title, outlet: feed.outlet }],
      })
      hits++
    }
    console.log(`  ${feed.outlet}: ${items.length} itens, ${hits} recentes.`)
  }
}

// ---------- 4. Google Autocomplete ----------
async function collectAutocomplete(map: Map<string, Candidate>) {
  console.log('4/4 Google Autocomplete...')
  for (const seed of AUTOCOMPLETE_SEEDS) {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&q=${encodeURIComponent(seed)}`
    let suggestions: string[] = []
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) {
        console.warn(`  [aviso] autocomplete "${seed}" respondeu ${res.status}`)
        continue
      }
      const data = JSON.parse(await res.text())
      suggestions = asArray<string>(data?.[1]).map((s) => String(s))
    } catch (err) {
      console.warn(`  [aviso] autocomplete "${seed}" falhou: ${(err as Error).message}`)
      continue
    }

    let hits = 0
    for (const sug of suggestions) {
      const clean = sug.trim()
      // ignora a propria semente e sugestoes genericas demais (ex.: "dorama romantico");
      // sem entidade conhecida, exige pelo menos 3 palavras para valer como pauta
      if (!clean || normalize(clean) === normalize(seed)) continue
      const match = matchNiche(clean)
      if (!match.matched) continue
      if (!match.entity && clean.split(/\s+/).length < 3) continue

      const topicKey = match.entity
        ? `${slugify(match.entity)}-${today()}` // agrupa com noticias do mesmo assunto
        : `sug-${slugify(clean).slice(0, 60)}` // evergreen: cria uma unica vez

      upsert(map, {
        topic: clean,
        topicKey,
        kind: 'news',
        // demanda real de busca: com entidade conhecida passa do corte do cron (45)
        score: 35 + (match.entity ? 15 : 0),
        matchedKeywords: match.keywords,
        trafficVolume: `autocomplete: "${seed}"`,
        sources: [
          {
            url: `https://www.google.com/search?q=${encodeURIComponent(clean)}`,
            title: clean,
            outlet: 'Google Autocomplete',
          },
        ],
      })
      hits++
    }
    console.log(`  "${seed}": ${suggestions.length} sugestoes, ${hits} aproveitadas.`)
    await new Promise((r) => setTimeout(r, 300)) // pausa curta entre consultas
  }
}

// ---------- main ----------
const map = new Map<string, Candidate>()
await collectTrends(map)
await collectGoogleNews(map)
await collectIntlFeeds(map)
await collectAutocomplete(map)

const candidates = [...map.values()].sort((a, b) => b.score - a.score)
console.log(`\nTotal: ${candidates.length} pautas candidatas.`)

if (DRY) {
  for (const c of candidates) {
    console.log(
      `  [${String(c.score).padStart(3)}] (${c.kind}) ${c.topic}  {${c.topicKey}}  fontes: ${c.sources.length}`,
    )
  }
  console.log('\nDRY=1: nada foi gravado.')
  process.exit(0)
}

// Grava no Payload (import dinamico: o modo DRY funciona sem banco).
const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')
const payload = await getPayload({ config: configPromise })

// pula chaves que ja existem (pauta ja vista em execucao anterior)
const keys = candidates.map((c) => c.topicKey)
const existing = await payload.find({
  collection: 'leads',
  where: { topicKey: { in: keys } },
  limit: keys.length || 1,
  depth: 0,
})
const known = new Set(existing.docs.map((d: any) => d.topicKey))

let created = 0
for (const c of candidates) {
  if (created >= MAX_LEADS) break
  if (known.has(c.topicKey)) continue
  await payload.create({
    collection: 'leads',
    data: {
      topic: c.topic,
      topicKey: c.topicKey,
      kind: c.kind,
      score: c.score,
      status: 'pending',
      matchedKeywords: c.matchedKeywords.join(', '),
      trafficVolume: c.trafficVolume,
      sources: c.sources.slice(0, 8),
    },
  })
  console.log(`  + lead [${c.score}] ${c.topic}`)
  created++
}

console.log(`\n${created} leads novos criados (${known.size} ja existiam).`)

// ---------- limpeza: expira pautas paradas na fila ----------
// Noticia velha nao vira artigo bom. Pendente ha mais de N dias -> descartada
// (o robo nunca vai escrever sobre ela e a fila fica so com o que e atual).
// Pautas do Autocomplete representam demanda de busca continua, entao duram mais.
const TTL_NEWS = parseInt(process.env.LEAD_TTL_NEWS_DAYS || '7', 10)
const TTL_SUGGEST = parseInt(process.env.LEAD_TTL_SUGGEST_DAYS || '30', 10)
{
  const cutoffNews = new Date(Date.now() - TTL_NEWS * 86400_000)
  const stale = await payload.find({
    collection: 'leads',
    where: {
      and: [
        { status: { equals: 'pending' } },
        { createdAt: { less_than: cutoffNews.toISOString() } },
      ],
    },
    limit: 500,
    depth: 0,
  })
  let expired = 0
  for (const l of stale.docs as any[]) {
    const isSuggest = String(l.trafficVolume ?? '').startsWith('autocomplete')
    const ttlDays = isSuggest ? TTL_SUGGEST : TTL_NEWS
    const ageDays = (Date.now() - new Date(l.createdAt).getTime()) / 86400_000
    if (ageDays <= ttlDays) continue
    await payload.update({
      collection: 'leads',
      id: l.id,
      data: {
        status: 'discarded',
        notes: `Expirada pelo radar: pendente ha ${Math.floor(ageDays)} dias (limite ${ttlDays}).`,
      },
    })
    expired++
  }
  if (expired > 0) console.log(`${expired} pautas antigas expiradas (>${TTL_NEWS}d noticias, >${TTL_SUGGEST}d autocomplete).`)
}

process.exit(0)
