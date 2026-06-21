import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

// Popula as categorias-base do blog (as abas do layout K-SPACE).
// Rodar com:  pnpm payload run scripts/seed-categories.ts
const categorias = [
  { name: 'Novidades', slug: 'novidades', color: '#ec4899' },
  { name: 'Atores', slug: 'atores', color: '#a855f7' },
  { name: 'Resenha de Episódios', slug: 'resenha-de-episodios', color: '#f43f5e' },
  { name: 'Séries', slug: 'series', color: '#8b5cf6' },
  { name: 'K-Pop', slug: 'k-pop', color: '#d946ef' },
]

const payload = await getPayload({ config: configPromise })

for (const cat of categorias) {
  const existe = await payload.find({
    collection: 'categories',
    where: { slug: { equals: cat.slug } },
    limit: 1,
  })

  if (existe.docs.length > 0) {
    console.log(`• já existia: ${cat.name}`)
    continue
  }

  await payload.create({ collection: 'categories', data: cat })
  console.log(`✓ criada: ${cat.name}`)
}

console.log('\nConcluído.')
process.exit(0)
