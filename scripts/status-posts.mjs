import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import dotenv from 'dotenv'

const dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(dirname, '../.env') })
const require = createRequire(
  path.resolve(dirname, '../node_modules/.pnpm/pg@8.20.0/node_modules/pg/package.json'),
)
const { Client } = require('pg')

const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const q = async (sql) => (await c.query(sql)).rows[0]

const total = await q(`select count(*)::int n from posts`)
const pub = await q(`select count(*)::int n from posts where _status='published'`)
const comCapa = await q(`select count(*)::int n from posts where hero_image_id is not null`)
const pubComCapa = await q(
  `select count(*)::int n from posts where _status='published' and hero_image_id is not null`,
)
const comHtmlWp = await q(
  `select count(*)::int n from posts where content_html like '%/wp-content/uploads/%'`,
)
const media = await q(`select count(*)::int n from media`)
const comments = await q(`select count(*)::int n from comments`)

console.log(`posts total:                 ${total.n}`)
console.log(`posts publicados:            ${pub.n}`)
console.log(`posts com capa:              ${comCapa.n} (publicados com capa: ${pubComCapa.n})`)
console.log(`posts ainda c/ imgs do WP:   ${comHtmlWp.n}  <- pendentes de reescrita`)
console.log(`registros em media (R2):     ${media.n}`)
console.log(`comentarios:                 ${comments.n}`)
await c.end()
