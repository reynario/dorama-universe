import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

/**
 * Exclui TODOS os posts sem imagem de capa (rascunhos e publicados).
 * Rodar SOMENTE apos scripts/recover-covers.ts (que salva o que da).
 *
 *   $env:NODE_OPTIONS="--no-deprecation --max-old-space-size=8000"
 *   pnpm exec payload run scripts/delete-no-cover.ts
 */

const payload = await getPayload({ config: configPromise })

const { docs } = await payload.find({
  collection: 'posts',
  where: { heroImage: { exists: false } },
  depth: 0,
  limit: 1000,
})

console.log(`Posts sem capa a excluir: ${docs.length}`)
let n = 0
for (const post of docs) {
  await payload.delete({ collection: 'posts', id: post.id, depth: 0 })
  n++
  if (n % 25 === 0) console.log(`... ${n} excluidos`)
}
console.log(`\nConcluido. Excluidos: ${n}`)
process.exit(0)
