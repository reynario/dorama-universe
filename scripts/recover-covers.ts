import { getPayload } from 'payload'
import { XMLParser } from 'fast-xml-parser'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import configPromise from '../src/payload.config'

/**
 * Recupera capas de posts publicados sem heroImage baixando a imagem
 * destacada ORIGINAL direto do site WordPress antigo (ainda no ar).
 *
 * Rodar: $env:NODE_OPTIONS="--no-deprecation --max-old-space-size=8000"
 *        pnpm exec payload run scripts/recover-covers.ts
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const XML_PATH =
  process.env.WP_XML ||
  path.resolve(__dirname, '../import/doramauniverse.WordPress.2026-06-21.xml')

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

const payload = await getPayload({ config: configPromise })

console.log('Lendo XML...')
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  trimValues: true,
})
const doc = parser.parse(readFileSync(XML_PATH, 'utf8'))
const items = asArray(doc?.rss?.channel?.item)

// anexos: id -> url original no site antigo
const attUrlById = new Map<string, string>()
for (const it of items) {
  if (txt(it['wp:post_type']) === 'attachment') {
    const id = txt(it['wp:post_id'])
    const url = txt(it['wp:attachment_url'])
    if (id && url) attUrlById.set(id, url)
  }
}

// slug -> { thumbUrl, firstImg }
const bySlug = new Map<string, { thumbUrl?: string; firstImg?: string }>()
for (const it of items) {
  if (txt(it['wp:post_type']) !== 'post') continue
  const slug = slugify(txt(it['wp:post_name']) || txt(it.title))
  if (!slug) continue
  const thumbId = asArray(it['wp:postmeta'])
    .map((m) => ({ k: txt(m['wp:meta_key']), v: txt(m['wp:meta_value']) }))
    .find((m) => m.k === '_thumbnail_id')?.v
  const thumbUrl = thumbId ? attUrlById.get(thumbId) : undefined
  const firstImg = txt(it['content:encoded']).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  bySlug.set(slug, { thumbUrl, firstImg })
}

// posts publicados sem capa
const { docs: pending } = await payload.find({
  collection: 'posts',
  where: {
    and: [{ heroImage: { exists: false } }, { _status: { equals: 'published' } }],
  },
  depth: 0,
  limit: 500,
})
console.log(`Publicados sem capa: ${pending.length}`)

async function download(url: string): Promise<{ buf: Buffer; mime: string; name: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1000) return null // pagina de erro, nao imagem
    const mime = res.headers.get('content-type') || 'image/jpeg'
    if (!mime.startsWith('image/')) return null
    const name = decodeURIComponent((url.split('/').pop() || 'capa.jpg').split('?')[0])
    return { buf, mime, name }
  } catch {
    return null
  }
}

let ok = 0
let fail = 0
for (const post of pending) {
  const info = bySlug.get(post.slug)
  const candidates = [info?.thumbUrl, info?.firstImg].filter(Boolean) as string[]
  let done = false
  for (const url of candidates) {
    const img = await download(url)
    if (!img) continue
    try {
      const media = await payload.create({
        collection: 'media',
        data: { alt: post.title },
        file: { data: img.buf, mimetype: img.mime, name: img.name, size: img.buf.length },
      })
      await payload.update({
        collection: 'posts',
        id: post.id,
        data: { heroImage: media.id },
        depth: 0,
      })
      console.log(`✓ ${post.slug}`)
      ok++
      done = true
      break
    } catch (err) {
      console.warn(`  ! upload falhou p/ ${post.slug}: ${(err as Error).message}`)
    }
  }
  if (!done) {
    console.warn(`✗ sem capa recuperavel: ${post.slug}`)
    fail++
  }
}

console.log(`\nConcluido. Recuperadas: ${ok} | Sem solucao: ${fail}`)
process.exit(0)
