import sharp from 'sharp'
import { escapeXml } from './text'

/**
 * Gerador de capa dos posts: busca a imagem oficial no TMDB (poster/backdrop
 * de dorama ou foto de ator/idol) e monta a arte 1200x630 com o template do
 * blog (gradiente + titulo + selo da categoria) usando sharp.
 *
 * Sem TMDB_API_KEY ou sem resultado na busca, cai no template "brand":
 * fundo degrade roxo/rosa com o titulo (nunca falha por falta de imagem).
 *
 * TMDB exige atribuicao: a capa carrega o credito "imagem: TMDB" quando a
 * foto vem de la.
 */

export const COVER_W = 1200
export const COVER_H = 630

export type CoverOptions = {
  title: string
  category?: string // texto do selo. Ex.: "K-Drama"
  query?: string // termo de busca no TMDB. Ex.: "Lovely Runner"
  type?: 'tv' | 'movie' | 'person' | 'multi' // padrao: multi
  tmdbId?: number // id exato no TMDB (pula a busca; exige type tv/movie/person)
}

export type CoverResult = {
  buffer: Buffer // versao SOCIAL (template completo com titulo) - usar como imagem OG
  cleanBuffer: Buffer // versao LIMPA (so a foto + credito) - usar como heroImage
  tmdbUsed: boolean
  tmdbLabel?: string // nome do resultado usado (para conferencia/alt)
}

// ---------- TMDB ----------
type TmdbImage = { url: string; portrait: boolean; label: string }

async function tmdbFetch(path: string): Promise<any | null> {
  const key = process.env.TMDB_API_KEY
  if (!key) return null
  const isV4 = key.startsWith('eyJ') // token "Read Access Token" (JWT)
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  const headers: Record<string, string> = { accept: 'application/json' }
  if (isV4) headers.authorization = `Bearer ${key}`
  else url.searchParams.set('api_key', key)
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
    if (!res.ok) {
      console.warn(`  [aviso] TMDB ${path} respondeu ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn(`  [aviso] TMDB indisponivel: ${(err as Error).message}`)
    return null
  }
}

// Busca a imagem de um item exato do TMDB (quando a busca por texto acha o
// resultado errado — ex.: filme homonimo).
async function findTmdbImageById(
  id: number,
  type: 'tv' | 'movie' | 'person',
): Promise<TmdbImage | null> {
  const r = await tmdbFetch(`/${type}/${id}?language=pt-BR`)
  if (!r) return null
  const label = r.name || r.title || String(id)
  if (r.backdrop_path) {
    return { url: `https://image.tmdb.org/t/p/w1280${r.backdrop_path}`, portrait: false, label }
  }
  if (r.profile_path) {
    return { url: `https://image.tmdb.org/t/p/h632${r.profile_path}`, portrait: true, label }
  }
  if (r.poster_path) {
    return { url: `https://image.tmdb.org/t/p/w780${r.poster_path}`, portrait: true, label }
  }
  return null
}

async function findTmdbImage(query: string, type: CoverOptions['type']): Promise<TmdbImage | null> {
  const endpoint = type && type !== 'multi' ? `/search/${type}` : '/search/multi'
  const data = await tmdbFetch(
    `${endpoint}?query=${encodeURIComponent(query)}&language=pt-BR&include_adult=false`,
  )
  const results: any[] = data?.results ?? []
  // pega o primeiro resultado que tenha alguma imagem
  for (const r of results.slice(0, 5)) {
    const label = r.name || r.title || query
    if (r.backdrop_path) {
      return { url: `https://image.tmdb.org/t/p/w1280${r.backdrop_path}`, portrait: false, label }
    }
    if (r.profile_path) {
      return { url: `https://image.tmdb.org/t/p/h632${r.profile_path}`, portrait: true, label }
    }
    if (r.poster_path) {
      return { url: `https://image.tmdb.org/t/p/w780${r.poster_path}`, portrait: true, label }
    }
  }
  return null
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

// ---------- template (SVG sobre a imagem) ----------
function wrapTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line)
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'
  }
  return lines
}

function overlaySvg(opts: { title: string; category?: string; credit?: string }): string {
  const { title, category, credit } = opts

  // fonte maior para titulos curtos
  const fontSize = title.length <= 45 ? 58 : title.length <= 80 ? 48 : 40
  const maxChars = Math.floor((COVER_W - 140) / (fontSize * 0.52))
  const lines = wrapTitle(title, maxChars, 3)
  const lineH = Math.round(fontSize * 1.18)

  const bottomPad = 56
  const firstLineY = COVER_H - bottomPad - (lines.length - 1) * lineH

  const titleSpans = lines
    .map(
      (l, i) =>
        `<text x="70" y="${firstLineY + i * lineH}" font-family="Arial, 'Segoe UI', sans-serif" font-weight="800" font-size="${fontSize}" fill="#ffffff">${escapeXml(l)}</text>`,
    )
    .join('\n  ')

  const badgeY = firstLineY - fontSize - 34
  const badge = category
    ? `<rect x="70" y="${badgeY}" rx="6" ry="6" width="${category.length * 13 + 36}" height="40" fill="#ec4899"/>
  <text x="${70 + 18}" y="${badgeY + 27}" font-family="Arial, 'Segoe UI', sans-serif" font-weight="700" font-size="21" letter-spacing="2" fill="#ffffff">${escapeXml(category.toUpperCase())}</text>`
    : ''

  const creditText = credit
    ? `<text x="${COVER_W - 24}" y="${COVER_H - 18}" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="rgba(255,255,255,0.55)">${escapeXml(credit)}</text>`
    : ''

  return `<svg width="${COVER_W}" height="${COVER_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="45%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.88"/>
    </linearGradient>
  </defs>
  <rect width="${COVER_W}" height="${COVER_H}" fill="url(#fade)"/>
  <text x="70" y="64" font-family="Arial, 'Segoe UI', sans-serif" font-weight="800" font-size="24" letter-spacing="4" fill="#ffffff" opacity="0.92">DORAMA <tspan fill="#ec4899">UNIVERSE</tspan></text>
  ${badge}
  ${titleSpans}
  ${creditText}
</svg>`
}

// fundo de marca para quando nao ha foto (degrade + circulos decorativos)
function brandBackgroundSvg(): string {
  return `<svg width="${COVER_W}" height="${COVER_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1033"/>
      <stop offset="55%" stop-color="#3b1258"/>
      <stop offset="100%" stop-color="#7c1d5f"/>
    </linearGradient>
  </defs>
  <rect width="${COVER_W}" height="${COVER_H}" fill="url(#bg)"/>
  <circle cx="1050" cy="90" r="180" fill="#ec4899" opacity="0.18"/>
  <circle cx="180" cy="560" r="240" fill="#8b5cf6" opacity="0.14"/>
  <circle cx="920" cy="500" r="90" fill="#ec4899" opacity="0.10"/>
</svg>`
}

// ---------- montagem ----------
export async function generateCover(opts: CoverOptions): Promise<CoverResult> {
  let base: sharp.Sharp | null = null
  let tmdbUsed = false
  let tmdbLabel: string | undefined

  if (opts.query || opts.tmdbId) {
    const img =
      opts.tmdbId && opts.type && opts.type !== 'multi'
        ? await findTmdbImageById(opts.tmdbId, opts.type)
        : await findTmdbImage(opts.query!, opts.type)
    if (img) {
      const raw = await download(img.url)
      if (raw) {
        tmdbUsed = true
        tmdbLabel = img.label
        if (img.portrait) {
          // retrato (poster/foto de pessoa): fundo = mesma imagem borrada,
          // foto inteira encaixada a direita
          const bg = await sharp(raw)
            .resize(COVER_W, COVER_H, { fit: 'cover' })
            .blur(28)
            .modulate({ brightness: 0.6 })
            .toBuffer()
          const fg = await sharp(raw)
            .resize({ height: COVER_H, fit: 'contain' })
            .toBuffer()
          const fgMeta = await sharp(fg).metadata()
          base = sharp(bg).composite([
            { input: fg, top: 0, left: COVER_W - (fgMeta.width ?? 420) - 60 },
          ])
          // achata a composicao para poder compor o overlay depois
          base = sharp(await base.jpeg({ quality: 92 }).toBuffer())
        } else {
          base = sharp(raw).resize(COVER_W, COVER_H, { fit: 'cover', position: 'attention' })
        }
      }
    }
  }

  if (!base) {
    base = sharp(Buffer.from(brandBackgroundSvg()))
  }

  // Achata a base uma vez e monta as duas versoes a partir dela.
  const baseBuffer = await base.jpeg({ quality: 92 }).toBuffer()
  const credit = tmdbUsed ? 'imagem: themoviedb.org' : undefined

  // Versao social: template completo (marca + selo + titulo + credito).
  const buffer = await sharp(baseBuffer)
    .composite([
      {
        input: Buffer.from(
          overlaySvg({ title: opts.title, category: opts.category, credit }),
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer()

  // Versao limpa: so a foto + credito discreto (o card/artigo ja mostram o
  // titulo em texto; credito fica dentro da area visivel mesmo com corte 16:10).
  const cleanOverlay = credit
    ? `<svg width="${COVER_W}" height="${COVER_H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${COVER_W - 120}" y="${COVER_H - 16}" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.55)">${escapeXml(credit)}</text>
</svg>`
    : null
  const cleanBuffer = cleanOverlay
    ? await sharp(baseBuffer)
        .composite([{ input: Buffer.from(cleanOverlay), top: 0, left: 0 }])
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer()
    : await sharp(baseBuffer).jpeg({ quality: 84, mozjpeg: true }).toBuffer()

  return { buffer, cleanBuffer, tmdbUsed, tmdbLabel }
}
