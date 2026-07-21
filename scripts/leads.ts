import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

/**
 * Utilitario da fila de pautas (collection "leads").
 *
 * Listar pendentes (ordenadas por score):
 *   pnpm payload run scripts/leads.ts
 *
 * Ver uma pauta completa (com links das fontes):
 *   $env:ACTION='show'; $env:LEAD='12'; pnpm payload run scripts/leads.ts
 *
 * Mudar status (pending | processing | done | discarded):
 *   $env:ACTION='mark'; $env:LEAD='12'; $env:STATUS='processing'; pnpm payload run scripts/leads.ts
 *   (opcional: $env:NOTES='motivo...')
 *
 * Contar pendentes "quentes" (usado pelo cron para decidir se chama a IA):
 *   ACTION=count MIN_SCORE=45 pnpm payload run scripts/leads.ts   -> imprime PENDENTES=<n>
 */

const ACTION = process.env.ACTION || 'list'
const LEAD = process.env.LEAD
const STATUS = process.env.STATUS

const payload = await getPayload({ config: configPromise })

if (ACTION === 'list') {
  const res = await payload.find({
    collection: 'leads',
    where: { status: { in: ['pending', 'processing'] } },
    sort: '-score',
    limit: 30,
    depth: 0,
  })
  if (res.docs.length === 0) {
    console.log('Nenhuma pauta pendente. Rode o radar: pnpm payload run scripts/radar.ts')
  }
  for (const l of res.docs as any[]) {
    console.log(
      `#${String(l.id).padEnd(5)} [${String(l.score).padStart(3)}] (${l.kind}/${l.status}) ${l.topic}  | fontes: ${l.sources?.length ?? 0} | ${l.matchedKeywords ?? ''}`,
    )
  }
} else if (ACTION === 'count') {
  const min = parseInt(process.env.MIN_SCORE || '45', 10)
  const res = await payload.find({
    collection: 'leads',
    where: { and: [{ status: { equals: 'pending' } }, { score: { greater_than_equal: min } }] },
    limit: 0,
    depth: 0,
  })
  console.log(`PENDENTES=${res.totalDocs}`)
} else if (ACTION === 'show') {
  if (!LEAD) {
    console.error('Defina LEAD=<id>')
    process.exit(1)
  }
  const l: any = await payload.findByID({ collection: 'leads', id: Number(LEAD), depth: 0 })
  console.log(JSON.stringify(l, null, 2))
} else if (ACTION === 'mark') {
  if (!LEAD || !STATUS) {
    console.error('Defina LEAD=<id> e STATUS=<pending|processing|done|discarded>')
    process.exit(1)
  }
  await payload.update({
    collection: 'leads',
    id: Number(LEAD),
    data: { status: STATUS as any, ...(process.env.NOTES ? { notes: process.env.NOTES } : {}) },
  })
  console.log(`Lead ${LEAD} -> ${STATUS}`)
} else {
  console.error(`ACTION desconhecida: ${ACTION}`)
  process.exit(1)
}

process.exit(0)
