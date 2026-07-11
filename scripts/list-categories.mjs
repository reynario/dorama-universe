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
const r = await c.query(`
  select cat.id, cat.name, cat.slug, cat.color, count(p.id)::int as posts
  from categories cat
  left join posts p on p.category_id = cat.id
  group by cat.id order by posts desc
`)
for (const row of r.rows)
  console.log(
    `${String(row.id).padStart(3)} | ${row.posts.toString().padStart(4)} posts | ${row.color || '(sem cor)'} | ${row.name} [${row.slug}]`,
  )
await c.end()
