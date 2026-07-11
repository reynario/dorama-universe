import { getPayload } from 'payload'
import { XMLParser } from 'fast-xml-parser'
import { readFileSync, existsSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import configPromise from '../src/payload.config'

/**
 * Vincula as imagens locais (C:\Users\Adm\Pictures\uploads) aos posts importados:
 *  - define a imagem de capa (heroImage) de cada post a partir da "imagem destacada"
 *    do WordPress (ou, na falta, da primeira imagem do conteudo);
 *  - sobe as imagens do meio do texto pro R2 e reescreve as URLs no contentHtml.
 *
 * As imagens sao casadas pela URL antiga (.../wp-content/uploads/AAAA/MM/arquivo.ext)
 * com o arquivo local equivalente (ja convertido para .webp).
 *
 * Cada arquivo local e enviado ao R2 no maximo uma vez (cache em memoria).
 * Idempotente: posts que ja tem capa nao tem a capa refeita; imagens ja reescritas
 * (que nao apontam mais para wp-content) sao ignoradas. Pode rodar de novo p/ continuar.
 *
 * Uso (PowerShell):
 *   $env:NODE_OPTIONS="--no-deprecation --max-old-space-size=8000"
 *   pnpm exec payload run scripts/link-images.ts
 *
 * Variaveis: LIMIT=10 (testar poucos),  UPLOADS=... (pasta das imagens)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const XML_PATH =
  process.env.WP_XML ||
  path.resolve(__dirname, '../import/doramauniverse.WordPress.2026-06-21.xml')
const UPLOADS = process.env.UPLOADS || 'C:/Users/Adm/Pictures/uploads'
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity

// ---------- helpers ----------
function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return []
  return Array.isArray(x) ? x : [x]
}
function txt(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return txt(o['#text'] ?? o['__cdata'] ?? '')
  }
  return ''
}
function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90)
}

const IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']
const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
}

// remove extensao de imagem (inclusive forma anexada .jpg.webp) e sufixo -LxA
function normName(name: string): string {
  let n = name.toLowerCase()
  n = n.replace(/\.(webp|avif)$/, '')
  n = n.replace(/\.(jpe?g|png|gif)$/, '')
  n = n.replace(/-\d+x\d+$/, '')
  return n
}

// ---------- indice local: "AAAA/MM/nome-normalizado" -> caminho real ----------
const localIndex = new Map<string, string>()
function indexDir(dir: string) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name)
    if (e.isDirectory()) indexDir(fp)
    else if (IMG_EXT.includes(path.extname(e.name).toLowerCase())) {
      const rel = path.relative(UPLOADS, fp).split(path.sep).join('/').toLowerCase()
      const relDir = rel.split('/').slice(0, -1).join('/')
      const key = relDir + '/' + normName(e.name)
      if (!localIndex.has(key)) localIndex.set(key, fp)
    }
  }
}

function resolveLocal(url: string): string | null {
  const m = url.match(/\/wp-content\/uploads\/(.+)$/i)
  if (!m) return null
  const rel = decodeURIComponent(m[1]).split('?')[0].toLowerCase()
  const relDir = rel.split('/').slice(0, -1).join('/')
  const base = normName(rel.split('/').pop() || '')
  return localIndex.get(relDir + '/' + base) || null
}

// ---------- main ----------
const payload = await getPayload({ config: configPromise })

console.log(`Indexando imagens locais em ${UPLOADS} ...`)
indexDir(UPLOADS)
console.log(`Arquivos locais indexados: ${localIndex.size}`)

const uploadCache = new Map<string, { id: number; url: string } | null>()
async function uploadLocal(localPath: string, alt: string) {
  if (uploadCache.has(localPath)) return uploadCache.get(localPath)!
  try {
    const buffer = readFileSync(localPath)
    const name = path.basename(localPath)
    const ext = path.extname(name).toLowerCase()
    const media = await payload.create({
      collection: 'media',
      data: { alt: alt || name },
      file: { data: buffer, mimetype: MIME[ext] || 'image/webp', name, size: buffer.length },
    })
    const res = { id: media.id as number, url: (media.url as string) || '' }
    uploadCache.set(localPath, res)
    return res
  } catch (err) {
    // Arquivo problematico (ex.: AVIF que o sharp nao decodifica): pula e segue.
    console.warn(`  ! upload falhou, pulando: ${path.basename(localPath)} (${(err as Error).message})`)
    uploadCache.set(localPath, null)
    return null
  }
}

async function rewriteContent(html: string, alt: string): Promise<{ html: string; n: number }> {
  const urls = new Set<string>()
  const re = /(?:src|data-src)=["']([^"']*\/wp-content\/uploads\/[^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) urls.add(m[1])

  let out = html
  let n = 0
  for (const url of urls) {
    const local = resolveLocal(url)
    if (!local) continue
    const up = await uploadLocal(local, alt)
    if (!up || !up.url) continue
    out = out.split(url).join(up.url)
    n++
  }
  // remove srcset/sizes que apontavam para tamanhos antigos do WP
  out = out.replace(/\ssrcset=["'][^"']*["']/gi, '').replace(/\ssizes=["'][^"']*["']/gi, '')
  return { html: out, n }
}

console.log(`Lendo XML ...`)
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  trimValues: true,
})
const doc = parser.parse(readFileSync(XML_PATH, 'utf8'))
const items = asArray(doc?.rss?.channel?.item)

// anexo: id -> url
const attUrlById = new Map<string, string>()
for (const it of items) {
  if (txt(it['wp:post_type']) === 'attachment') {
    const id = txt(it['wp:post_id'])
    const url = txt(it['wp:attachment_url'])
    if (id && url) attUrlById.set(id, url)
  }
}

let count = 0
let updated = 0
let heroSet = 0
let imgsRewritten = 0

for (const it of items) {
  if (txt(it['wp:post_type']) !== 'post') continue
  if (count >= LIMIT) break
  count++

  const title = txt(it.title).trim()
  const slug = slugify(txt(it['wp:post_name']) || title)
  if (!slug) continue

  const found = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const post = found.docs[0]
  if (!post) continue

  const patch: Record<string, unknown> = {}

  // ----- capa -----
  if (!post.heroImage) {
    const thumbId = asArray(it['wp:postmeta'])
      .map((mm) => ({ k: txt(mm['wp:meta_key']), v: txt(mm['wp:meta_value']) }))
      .find((mm) => mm.k === '_thumbnail_id')?.v
    let local: string | null = null
    const thumbUrl = thumbId ? attUrlById.get(thumbId) : undefined
    if (thumbUrl) local = resolveLocal(thumbUrl)
    if (!local) {
      const first = txt(it['content:encoded']).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
      if (first) local = resolveLocal(first)
    }
    if (local) {
      const up = await uploadLocal(local, title)
      if (up) {
        patch.heroImage = up.id
        heroSet++
      }
    }
  }

  // ----- imagens do conteudo -----
  const html = post.contentHtml || ''
  if (html.includes('/wp-content/uploads/')) {
    const { html: newHtml, n } = await rewriteContent(html, title)
    if (n > 0) {
      patch.contentHtml = newHtml
      imgsRewritten += n
    }
  }

  if (Object.keys(patch).length > 0) {
    await payload.update({ collection: 'posts', id: post.id, data: patch })
    updated++
  }

  if (count % 25 === 0) {
    console.log(
      `... ${count} posts | atualizados ${updated} | capas ${heroSet} | imgs ${imgsRewritten} | uploads ${uploadCache.size}`,
    )
  }
}

console.log(
  `\nConcluido. Posts processados: ${count} | atualizados: ${updated} | capas definidas: ${heroSet} | imagens reescritas: ${imgsRewritten} | uploads ao R2: ${uploadCache.size}`,
)
process.exit(0)
