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
const r = await c.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name",
)
console.log(r.rows.map((x) => '  - ' + x.table_name).join('\n'))
await c.end()
