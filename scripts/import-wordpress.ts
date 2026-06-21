import { getPayload } from 'payload'
import { XMLParser } from 'fast-xml-parser'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import configPromise from '../src/payload.config'

/**
 * Importa o conteudo de um export do WordPress (arquivo WXR / .xml) para o
 * Payload: categorias, tags, autores e posts (com o HTML original no campo
 * contentHtml).
 *
 * Como rodar (PowerShell), com mais memoria por causa do XML grande:
 *   $env:NODE_OPTIONS="--max-old-space-size=8000"; pnpm payload run scripts/import-wordpress.ts
 *
 * Variaveis opcionais:
 *   LIMIT=5        -> importa apenas os 5 primeiros posts (teste)
 *   WITH_IMAGES=1  -> baixa a imagem de capa de cada post e sobe pro R2 (lento)
 *   WP_XML=...     -> caminho alternativo do arquivo XML
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const XML_PATH =
  process.env.WP_XML ||
  path.resolve(__dirname, '../import/doramauniverse.WordPress.2026-06-21.xml')
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity
const WITH_IMAGES = process.env.WITH_IMAGES === '1'

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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
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

function toISO(wpDate: string): string {
  if (!wpDate || wpDate.startsWith('0000')) return new Date().toISOString()
  const d = new Date(wpDate.replace(' ', 'T'))
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

// ---------- main ----------
const payload = await getPayload({ config: configPromise })

console.log(`Lendo XML: ${XML_PATH}`)
const xml = readFileSync(XML_PATH, 'utf8')
console.log(`Tamanho: ${(xml.length / 1024 / 1024).toFixed(1)} MB. Parseando...`)

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  trimValues: true,
})
const doc = parser.parse(xml)
const channel = doc?.rss?.channel
if (!channel) throw new Error('XML invalido: nao encontrei rss > channel')

const items = asArray(channel.item)
console.log(`Itens no XML: ${items.length}`)

// Mapa login -> nome de exibicao do autor
const authorNameByLogin = new Map<string, string>()
for (const a of asArray(channel['wp:author'])) {
  const login = txt(a['wp:author_login'])
  const display = txt(a['wp:author_display_name']) || login
  if (login) authorNameByLogin.set(login, display)
}

// Mapa de anexos: id do attachment -> URL
const attachmentUrlById = new Map<string, string>()
for (const it of items) {
  if (txt(it['wp:post_type']) === 'attachment') {
    const id = txt(it['wp:post_id'])
    const url = txt(it['wp:attachment_url'])
    if (id && url) attachmentUrlById.set(id, url)
  }
}

// ---------- caches de upsert ----------
const catCache = new Map<string, number>() // slug -> id
const tagCache = new Map<string, number>()
const authorCache = new Map<string, number>() // nome -> id

async function preload() {
  const cats = await payload.find({ collection: 'categories', limit: 1000, depth: 0 })
  for (const c of cats.docs) catCache.set(c.slug, c.id)
  const tags = await payload.find({ collection: 'tags', limit: 5000, depth: 0 })
  for (const t of tags.docs) tagCache.set(t.slug, t.id)
  const authors = await payload.find({ collection: 'authors', limit: 1000, depth: 0 })
  for (const a of authors.docs) authorCache.set(a.name, a.id)
}

async function upsertCategory(name: string, slug: string): Promise<number> {
  slug = slug || slugify(name)
  if (catCache.has(slug)) return catCache.get(slug)!
  const created = await payload.create({ collection: 'categories', data: { name, slug } })
  catCache.set(slug, created.id)
  console.log(`  + categoria: ${name}`)
  return created.id
}

async function upsertTag(name: string, slug: string): Promise<number> {
  slug = slug || slugify(name)
  if (tagCache.has(slug)) return tagCache.get(slug)!
  const created = await payload.create({ collection: 'tags', data: { name, slug } })
  tagCache.set(slug, created.id)
  return created.id
}

async function upsertAuthor(name: string): Promise<number> {
  name = name || 'Redação'
  if (authorCache.has(name)) return authorCache.get(name)!
  const created = await payload.create({ collection: 'authors', data: { name } })
  authorCache.set(name, created.id)
  console.log(`  + autor: ${name}`)
  return created.id
}

async function uploadImage(url: string, alt: string): Promise<number | undefined> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return undefined
    const buffer = Buffer.from(await resp.arrayBuffer())
    const name = decodeURIComponent((url.split('/').pop() || 'image').split('?')[0])
    const media = await payload.create({
      collection: 'media',
      data: { alt: alt || name },
      file: {
        data: buffer,
        mimetype: resp.headers.get('content-type') || 'image/jpeg',
        name,
        size: buffer.length,
      },
    })
    return media.id
  } catch (err) {
    console.warn(`  ! falha ao baixar imagem ${url}: ${(err as Error).message}`)
    return undefined
  }
}

await preload()

// slugs ja existentes (para nao duplicar)
const existing = await payload.find({ collection: 'posts', limit: 100000, depth: 0 })
const existingSlugs = new Set(existing.docs.map((p) => p.slug))

const fallbackCategoryId = await upsertCategory('Novidades', 'novidades')

let created = 0
let skipped = 0
let count = 0

for (const it of items) {
  if (txt(it['wp:post_type']) !== 'post') continue
  if (count >= LIMIT) break
  count++

  const title = txt(it.title).trim()
  let slug = slugify(txt(it['wp:post_name']) || title)
  if (!title || !slug) {
    skipped++
    continue
  }
  if (existingSlugs.has(slug)) {
    skipped++
    continue
  }

  // categorias e tags
  let categoryId = fallbackCategoryId
  const tagIds: number[] = []
  for (const c of asArray(it.category)) {
    const domain = (c?.['@_domain'] as string) || ''
    const name = txt(c).trim()
    const nice = (c?.['@_nicename'] as string) || slugify(name)
    if (!name) continue
    if (domain === 'post_tag') {
      tagIds.push(await upsertTag(name, nice))
    } else if (domain === 'category') {
      categoryId = await upsertCategory(name, nice)
    }
  }

  // autor
  const login = txt(it['dc:creator'])
  const authorName = authorNameByLogin.get(login) || login || 'Redação'
  const authorId = await upsertAuthor(authorName)

  // conteudo / resumo
  const contentHtml = txt(it['content:encoded'])
  let excerpt = stripHtml(txt(it['excerpt:encoded']))
  if (!excerpt) excerpt = stripHtml(contentHtml).slice(0, 220)
  if (!excerpt) excerpt = title

  // status
  const wpStatus = txt(it['wp:status'])
  const status = wpStatus === 'publish' ? 'published' : 'draft'

  // imagem de capa (opcional)
  let heroImage: number | undefined
  if (WITH_IMAGES) {
    const thumbId = asArray(it['wp:postmeta'])
      .map((m) => ({ k: txt(m['wp:meta_key']), v: txt(m['wp:meta_value']) }))
      .find((m) => m.k === '_thumbnail_id')?.v
    const url = thumbId ? attachmentUrlById.get(thumbId) : undefined
    if (url) heroImage = await uploadImage(url, title)
  }

  await payload.create({
    collection: 'posts',
    data: {
      title,
      slug,
      excerpt,
      contentHtml,
      category: categoryId,
      author: authorId,
      tags: tagIds,
      heroImage,
      likes: 0,
      publishedAt: toISO(txt(it['wp:post_date'])),
      _status: status,
    },
  })

  existingSlugs.add(slug)
  created++
  if (created % 25 === 0) console.log(`... ${created} posts importados`)
}

console.log(`\nConcluido. Criados: ${created} | Pulados: ${skipped}`)
process.exit(0)
