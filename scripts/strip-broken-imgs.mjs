import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import dotenv from 'dotenv'

// Remove do texto dos posts as imagens quebradas que ainda apontam para o
// WordPress antigo (offline). Tira o bloco <figure> inteiro quando existir,
// senao o <a><img></a> ou o <img> solto.
// Uso: node scripts/strip-broken-imgs.mjs

const dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(dirname, '../.env') })
const require = createRequire(
  path.resolve(dirname, '../node_modules/.pnpm/pg@8.20.0/node_modules/pg/package.json'),
)
const { Client } = require('pg')

const WP = /wp-content\/uploads/

function clean(html) {
  let out = html
  // 1) <figure> ... img do wp ... </figure> (inclui figcaption)
  out = out.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (m) => (WP.test(m) ? '' : m))
  // 2) <a ...><img wp ...></a>
  out = out.replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, (m) => (WP.test(m) ? '' : m))
  // 3) <img wp ...> solto
  out = out.replace(/<img\b[^>]*>/gi, (m) => (WP.test(m) ? '' : m))
  return out
}

const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const { rows } = await c.query(
  `select id, title, content_html from posts where content_html like '%/wp-content/uploads/%'`,
)
console.log(`Posts com imagens quebradas: ${rows.length}`)

let done = 0
for (const row of rows) {
  const cleaned = clean(row.content_html)
  const stillHasImgTag = /<(img|figure)\b[^>]*wp-content\/uploads/i.test(cleaned)
  await c.query('update posts set content_html=$1 where id=$2', [cleaned, row.id])
  done++
  console.log(`✓ ${row.title.slice(0, 60)}${stillHasImgTag ? '  (atencao: restou referencia)' : ''}`)
}

const { rows: check } = await c.query(
  `select count(*)::int n from posts where content_html ~* '<(img|figure)[^>]*wp-content/uploads'`,
)
console.log(`\nConcluido. Limpos: ${done} | posts ainda com <img> do WP: ${check[0].n}`)
await c.end()
