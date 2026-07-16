import { XMLParser } from 'fast-xml-parser'
import { matchNiche } from './lib/niche'
import { slugify } from './lib/text'

/**
 * RADAR DE PAUTAS - descobre o que esta em alta sobre dorama/k-pop e grava
 * na collection "leads" do Payload para o gerador de artigos consumir.
 *
 * Fontes (todas gratuitas):
 *   1. Google Trends "Em alta" Brasil (RSS)          -> termos explodindo agora
 *   2. Google News BR (RSS de busca por dorama/k-pop) -> o que a imprensa cobre
 *   3. Feeds internacionais (Soompi, Koreaboo, ...)   -> furos para adaptar ao BR
 *
 * Como rodar:
 *   pnpm payload run scripts/radar.ts          -> grava leads novos
 *   DRY=1 pnpm payload run scripts/radar.ts    -> so mostra o que encontraria
 *
 * Variaveis opcionais:
 *   MAX_LEADS=15   -> maximo de leads criados por execucao
 *   FRESH_HOURS=48 -> ignora noticias mais antigas que isso
 */

const DRY = process.env.DRY === '1'
const MAX_LEADS = parseInt(process.env.MAX_LEADS || '15', 10)
const FRESH_HOURS = parseInt(process.env.FRESH_HOURS || '48', 10)

const TRENDS_RSS = 'https://trends.google.com.br/trending/rss?geo=BR'

const GOOGLE_NEWS_QUERIES = ['dorama', 'k-drama', 'k-pop', 'drama coreano netflix']

const INTL_FEEDS: { url: string; outlet: string }[] = [
  { url: 'https://www.soompi.com/feed', outlet: 'Soompi' },
  { url: 'https://www.koreaboo.com/feed/', outlet: 'Koreaboo' },
  { url: 'https://www.dramabeans.com/feed/', outlet: 'Dramabeans' },
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
async function collectTrends(map: Map<string, Candidate>) {
  console.log('1/3 Google Trends BR (em alta)...')
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
  console.log('2/3 Google News BR...')
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
  console.log('3/3 Feeds internacionais...')
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

// ---------- main ----------
const map = new Map<string, Candidate>()
await collectTrends(map)
await collectGoogleNews(map)
await collectIntlFeeds(map)

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
process.exit(0)
