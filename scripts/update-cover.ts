import { getPayload } from 'payload'
import configPromise from '../src/payload.config'
import { generateCover } from './lib/cover'

/**
 * Regenera a capa de um post existente (busca TMDB + template sharp) e troca
 * o heroImage. Util quando a capa saiu no template brand e depois a
 * TMDB_API_KEY foi configurada, ou para melhorar a busca.
 *
 * Uso (PowerShell):
 *   $env:POST_ID='1556'; $env:QUERY='BTS'; $env:TYPE='multi'; pnpm payload run scripts/update-cover.ts
 *
 * Variaveis:
 *   POST_ID  (obrigatorio) id do post
 *   QUERY    termo de busca no TMDB (dorama/filme/pessoa)
 *   TYPE     tv | movie | person | multi (padrao: multi)
 *   ALT      texto alternativo da nova capa (padrao: titulo do post)
 */

const POST_ID = process.env.POST_ID
if (!POST_ID) {
  console.error('Defina POST_ID=<id do post> (e QUERY=<busca no TMDB>)')
  process.exit(1)
}

const payload = await getPayload({ config: configPromise })

const post: any = await payload
  .findByID({ collection: 'posts', id: Number(POST_ID), depth: 1, draft: true })
  .catch(() => null)
if (!post) {
  console.error(`Post ${POST_ID} nao encontrado.`)
  process.exit(1)
}

const category = typeof post.category === 'object' ? post.category : null

const gen = await generateCover({
  title: post.title,
  category: category?.name,
  query: process.env.QUERY,
  type: (process.env.TYPE as any) || 'multi',
  tmdbId: process.env.TMDB_ID ? Number(process.env.TMDB_ID) : undefined,
})
console.log(`Capa: ${gen.tmdbUsed ? `TMDB (${gen.tmdbLabel})` : 'template brand (sem TMDB)'}`)

const media = await payload.create({
  collection: 'media',
  data: { alt: process.env.ALT || post.title },
  file: {
    data: gen.buffer,
    mimetype: 'image/jpeg',
    name: `${post.slug}-capa-${Date.now()}.jpg`,
    size: gen.buffer.length,
  },
})

const isDraft = post._status !== 'published'
await payload.update({
  collection: 'posts',
  id: Number(POST_ID),
  data: { heroImage: (media as any).id },
  draft: isDraft,
})

// apaga a capa antiga para nao acumular lixo no R2
const oldId = typeof post.heroImage === 'object' ? post.heroImage?.id : post.heroImage
if (oldId) {
  await payload
    .delete({ collection: 'media', id: oldId })
    .then(() => console.log(`Capa antiga (media #${oldId}) apagada.`))
    .catch((e) => console.log(`Capa antiga mantida: ${e.message}`))
}

console.log(`Post #${POST_ID} atualizado com a nova capa (media #${(media as any).id}).`)
process.exit(0)
