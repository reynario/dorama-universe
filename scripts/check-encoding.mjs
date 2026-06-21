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
const r = await c.query('select title, slug, _status from posts order by id desc limit 6')
for (const row of r.rows) console.log(`[${row._status}] ${row.title}`)
await c.end()
