import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

/**
 * Apaga um post e (opcionalmente) a imagem de capa dele.
 * Util para descartar rascunhos ruins do robo de conteudo.
 *
 * Uso (PowerShell):
 *   $env:POST_ID='1553'; pnpm payload run scripts/delete-post.ts
 *   $env:POST_ID='1553'; $env:KEEP_MEDIA='1'; ...   -> mantem a capa
 */

const POST_ID = process.env.POST_ID
if (!POST_ID) {
  console.error('Defina POST_ID=<id do post>')
  process.exit(1)
}

const payload = await getPayload({ config: configPromise })

const post: any = await payload
  .findByID({ collection: 'posts', id: Number(POST_ID), depth: 0 })
  .catch(() => null)
if (!post) {
  console.error(`Post ${POST_ID} nao encontrado.`)
  process.exit(1)
}

await payload.delete({ collection: 'posts', id: Number(POST_ID) })
console.log(`Post #${POST_ID} apagado: ${post.title}`)

if (post.heroImage && process.env.KEEP_MEDIA !== '1') {
  const mediaId = typeof post.heroImage === 'object' ? post.heroImage.id : post.heroImage
  await payload
    .delete({ collection: 'media', id: mediaId })
    .then(() => console.log(`Capa (media #${mediaId}) apagada.`))
    .catch((e) => console.log(`Capa nao apagada: ${e.message}`))
}

process.exit(0)
