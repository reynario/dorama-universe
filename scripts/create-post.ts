import { getPayload } from 'payload'
import { readFileSync, existsSync } from 'fs'
import configPromise from '../src/payload.config'
import { generateCover } from './lib/cover'
import { slugify } from './lib/text'

/**
 * Publica um artigo do robo de conteudo no Payload:
 * gera a capa (TMDB + template sharp), sobe para o R2 (collection media)
 * e cria o post — como RASCUNHO por padrao (revisao humana no admin).
 *
 * Uso:
 *   $env:POST_JSON='caminho/artigo.json'; pnpm payload run scripts/create-post.ts
 *
 * Formato do JSON:
 * {
 *   "title": "...",                        (obrigatorio)
 *   "slug": "...",                         (opcional; padrao = slug do titulo)
 *   "excerpt": "...",                      (obrigatorio)
 *   "contentHtml": "<p>...</p>",           (obrigatorio; HTML limpo)
 *   "category": "k-pop",                   (obrigatorio; slug ou nome)
 *   "tags": ["Stray Kids", "Rock in Rio"],
 *   "author": "Nome do autor",             (opcional; padrao = 1o autor)
 *   "metaTitle": "...", "metaDescription": "...",
 *   "faq": [{ "question": "...", "answer": "..." }],
 *   "sources": [{ "url": "...", "title": "..." }],
 *   "cover": { "query": "Lovely Runner", "type": "tv|movie|person|multi",
 *              "alt": "...", "file": "caminho/imagem-pronta.jpg" },
 *   "leadId": 12,                          (opcional; marca o lead como done)
 *   "publish": false,                      (true = publica direto, sem revisao)
 *   "featured": false
 * }
 */

const jsonPath = process.env.POST_JSON
if (!jsonPath || !existsSync(jsonPath)) {
  console.error('Defina POST_JSON=<caminho do .json do artigo>')
  process.exit(1)
}

type ArticleJson = {
  title: string
  slug?: string
  excerpt: string
  contentHtml: string
  category: string
  tags?: string[]
  author?: string
  metaTitle?: string
  metaDescription?: string
  faq?: { question: string; answer: string }[]
  sources?: { url: string; title?: string }[]
  cover?: {
    query?: string
    type?: 'tv' | 'movie' | 'person' | 'multi'
    tmdbId?: number
    alt?: string
    file?: string
  }
  leadId?: number
  publish?: boolean
  featured?: boolean
}

const art: ArticleJson = JSON.parse(readFileSync(jsonPath, 'utf8'))
for (const campo of ['title', 'excerpt', 'contentHtml', 'category'] as const) {
  if (!art[campo]) {
    console.error(`Campo obrigatorio ausente no JSON: ${campo}`)
    process.exit(1)
  }
}

const payload = await getPayload({ config: configPromise })

// ---------- slug unico ----------
let slug = art.slug ? slugify(art.slug) : slugify(art.title)
{
  const clash = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (clash.docs.length > 0) {
    slug = `${slug}-${new Date().toISOString().slice(5, 10).replace('-', '')}`.slice(0, 90)
    console.log(`  slug ja existia; usando "${slug}"`)
  }
}

// ---------- categoria ----------
const catRes = await payload.find({
  collection: 'categories',
  where: {
    or: [{ slug: { equals: slugify(art.category) } }, { name: { equals: art.category } }],
  },
  limit: 1,
  depth: 0,
})
const category = catRes.docs[0] as any
if (!category) {
  const all = await payload.find({ collection: 'categories', limit: 50, depth: 0 })
  console.error(
    `Categoria "${art.category}" nao encontrada. Existentes: ${(all.docs as any[]).map((c) => c.slug).join(', ')}`,
  )
  process.exit(1)
}

// ---------- tags (cria as que faltarem) ----------
const tagIds: number[] = []
for (const t of art.tags ?? []) {
  const tSlug = slugify(t)
  const found = await payload.find({
    collection: 'tags',
    where: { slug: { equals: tSlug } },
    limit: 1,
    depth: 0,
  })
  if (found.docs.length > 0) {
    tagIds.push((found.docs[0] as any).id)
  } else {
    const created = await payload.create({ collection: 'tags', data: { name: t, slug: tSlug } })
    tagIds.push((created as any).id)
  }
}

// ---------- autor ----------
let author: any = null
if (art.author) {
  const a = await payload.find({
    collection: 'authors',
    where: { name: { equals: art.author } },
    limit: 1,
    depth: 0,
  })
  author = a.docs[0]
}
if (!author) {
  const a = await payload.find({ collection: 'authors', limit: 1, depth: 0 })
  author = a.docs[0]
}
if (!author) {
  console.error('Nenhum autor cadastrado na collection "authors". Crie um no admin primeiro.')
  process.exit(1)
}

// ---------- capa ----------
let coverBuffer: Buffer
let coverNote = ''
if (art.cover?.file && existsSync(art.cover.file)) {
  coverBuffer = readFileSync(art.cover.file)
  coverNote = `arquivo local (${art.cover.file})`
} else {
  const gen = await generateCover({
    title: art.title,
    category: category.name,
    query: art.cover?.query,
    type: art.cover?.type,
    tmdbId: art.cover?.tmdbId,
  })
  coverBuffer = gen.buffer
  coverNote = gen.tmdbUsed ? `TMDB (${gen.tmdbLabel})` : 'template brand (sem TMDB)'
}

const media = await payload.create({
  collection: 'media',
  data: { alt: art.cover?.alt || art.title },
  file: {
    data: coverBuffer,
    mimetype: 'image/jpeg',
    name: `${slug}-capa.jpg`,
    size: coverBuffer.length,
  },
})
console.log(`  capa: ${coverNote} -> media #${(media as any).id}`)

// ---------- post ----------
const post = await payload.create({
  collection: 'posts',
  data: {
    title: art.title,
    slug,
    excerpt: art.excerpt,
    contentHtml: art.contentHtml,
    heroImage: (media as any).id,
    category: category.id,
    author: author.id,
    tags: tagIds,
    publishedAt: new Date().toISOString(),
    featured: Boolean(art.featured),
    seo: {
      metaTitle: art.metaTitle?.slice(0, 70),
      metaDescription: art.metaDescription?.slice(0, 170),
    },
    faq: art.faq ?? [],
    sourceLinks: art.sources ?? [],
    _status: art.publish ? 'published' : 'draft',
  } as any,
})

const postId = (post as any).id
console.log(`  post #${postId} criado (${art.publish ? 'PUBLICADO' : 'rascunho'}): ${art.title}`)

// ---------- lead ----------
if (art.leadId) {
  await payload.update({
    collection: 'leads',
    id: art.leadId,
    data: { status: 'done', post: postId },
  })
  console.log(`  lead #${art.leadId} -> done`)
}

const adminUrl = `${process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/admin/collections/posts/${postId}`
console.log(`\nRevisar no admin: ${adminUrl}`)
process.exit(0)
