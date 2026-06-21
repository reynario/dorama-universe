import 'dotenv/config'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { Client } = require('../node_modules/.pnpm/pg@8.20.0/node_modules/pg')

const url = process.env.DATABASE_URL || ''
console.log('Conectando em:', url.replace(/:[^:@/]+@/, ':****@'))

const client = new Client({ connectionString: url })

try {
  await client.connect()
  console.log('[1/2] Conexao estabelecida. OK')

  const r = await client.query('select version(), current_database(), now()')
  console.log('[2/2] Query OK')
  console.log('      db:     ', r.rows[0].current_database)
  console.log('      version:', r.rows[0].version.split(' ').slice(0, 2).join(' '))
  console.log('      now:    ', r.rows[0].now)

  const tbls = await client.query(
    "select count(*)::int as n from information_schema.tables where table_schema='public'",
  )
  console.log('      tabelas no schema public:', tbls.rows[0].n)

  console.log('\n✅ Supabase conectado e respondendo.')
  await client.end()
  process.exit(0)
} catch (err) {
  console.error('\n❌ Falha no Supabase:', err.code || err.name, '-', err.message)
  await client.end().catch(() => {})
  process.exit(1)
}
