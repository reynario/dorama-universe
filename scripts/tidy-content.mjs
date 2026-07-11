import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import dotenv from 'dotenv'

// Organiza o conteudo importado do WordPress:
//  1) Unifica categorias duplicadas (ES/EN -> PT)
//  2) Da cor a todas as categorias
//  3) Conserta resumos cortados no meio da palavra (corta na palavra + "…")
// Uso: node scripts/tidy-content.mjs

const dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(dirname, '../.env') })
const require = createRequire(
  path.resolve(dirname, '../node_modules/.pnpm/pg@8.20.0/node_modules/pg/package.json'),
)
const { Client } = require('pg')

const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

// ---------- 1) unificacao de categorias (slug alvo <- slugs fundidos) ----------
const MERGES = {
  novidades: ['novidades-e-lancamentos', 'novedades-y-lanzamientos-es'],
  atores: ['atores-e-atrizes', 'actores-y-actrices', 'actors-and-actresses-pt'],
  'resenha-de-episodios': ['analises', 'analisis'],
  lista: ['lista-es'],
}

const { rows: cats } = await c.query('select id, slug from categories')
const idBySlug = new Map(cats.map((r) => [r.slug, r.id]))

// tabelas/colunas que referenciam categoria
const { rows: verCols } = await c.query(`
  select column_name from information_schema.columns
  where table_name='_posts_v' and column_name like '%category%'
`)
const verCol = verCols[0]?.column_name // ex.: version_category_id

for (const [target, sources] of Object.entries(MERGES)) {
  const targetId = idBySlug.get(target)
  if (!targetId) {
    console.warn(`! categoria alvo nao encontrada: ${target}`)
    continue
  }
  for (const src of sources) {
    const srcId = idBySlug.get(src)
    if (!srcId) continue
    const upd = await c.query('update posts set category_id=$1 where category_id=$2', [
      targetId,
      srcId,
    ])
    if (verCol) {
      await c.query(`update _posts_v set ${verCol}=$1 where ${verCol}=$2`, [targetId, srcId])
    }
    await c.query('delete from categories where id=$1', [srcId])
    console.log(`✓ ${src} -> ${target} (${upd.rowCount} posts movidos, categoria apagada)`)
  }
}

// ---------- 2) cores ----------
const COLORS = {
  noticias: '#4a1259',
  novidades: '#ec4899',
  atores: '#a855f7',
  'resenha-de-episodios': '#f43f5e',
  series: '#8b5cf6',
  'k-pop': '#d946ef',
  lista: '#0ea5e9',
  'romances-classicos': '#e11d48',
  curiosidades: '#f59e0b',
  'dorama-de-outros-paises': '#10b981',
}
for (const [slug, color] of Object.entries(COLORS)) {
  await c.query('update categories set color=$1 where slug=$2', [color, slug])
}
console.log('✓ cores aplicadas')

// ---------- 3) resumos cortados ----------
const fix = await c.query(`
  update posts
  set excerpt = rtrim(left(excerpt, 200 - position(' ' in reverse(left(excerpt, 200)))), ' ,;:-') || '…'
  where length(excerpt) >= 200
    and right(excerpt, 1) not in ('.', '!', '?', '…')
`)
console.log(`✓ resumos consertados: ${fix.rowCount}`)

// resumo final
const { rows: finalCats } = await c.query(`
  select cat.name, cat.color, count(p.id)::int posts
  from categories cat left join posts p on p.category_id=cat.id
  group by cat.id order by posts desc
`)
console.log('\nCategorias finais:')
for (const r of finalCats) console.log(`  ${r.posts.toString().padStart(4)} | ${r.color} | ${r.name}`)
await c.end()
