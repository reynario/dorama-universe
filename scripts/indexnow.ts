import { getPayload } from 'payload'
import type { Where } from 'payload'
import configPromise from '../src/payload.config'
import { enviarIndexNow, urlDoPost, INDEXNOW_KEY } from '../src/lib/indexnow'

/**
 * Envio manual/em massa ao IndexNow (Bing, Yandex, Seznam, Naver).
 *
 * O dia a dia e automatico: o hook afterChange de Posts avisa sozinho a cada
 * publicacao. Este script serve para o mutirao inicial e para reenvios pontuais.
 *
 * Acervo inteiro (home + categorias + todos os posts publicados):
 *   pnpm payload run scripts/indexnow.ts
 *
 * So o que mudou nos ultimos N dias (bom para rodar depois de uma edicao em lote):
 *   DIAS=7 pnpm payload run scripts/indexnow.ts
 *
 * URLs especificas:
 *   URLS='https://doramauniverse.com/posts/abc,https://doramauniverse.com/' pnpm payload run scripts/indexnow.ts
 *
 * Simular sem enviar:
 *   DRY=1 pnpm payload run scripts/indexnow.ts
 */

const SITE = process.env.FRONTEND_URL || 'https://doramauniverse.com'
const DRY = process.env.DRY === '1'
const DIAS = process.env.DIAS ? parseInt(process.env.DIAS, 10) : null
const URLS = process.env.URLS

async function coletarUrls(): Promise<string[]> {
  if (URLS) return URLS.split(',').map((u) => u.trim()).filter(Boolean)

  const payload = await getPayload({ config: configPromise })
  const urls: string[] = []

  // Num envio recortado por data, a home e as categorias nao entram: elas nao
  // "mudaram" no sentido que interessa, e o objetivo e ser cirurgico.
  if (!DIAS) {
    urls.push(SITE)
    const cats = await payload.find({
      collection: 'categories',
      limit: 100,
      depth: 0,
    })
    for (const c of cats.docs) {
      if (c.slug) urls.push(`${SITE}/categoria/${c.slug}`)
    }
  }

  const where: Where = { _status: { equals: 'published' } }
  if (DIAS) {
    const corte = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString()
    where.updatedAt = { greater_than: corte }
  }

  // Pagina de 500 em 500 para nao carregar 1.4 mil documentos de uma vez.
  let page = 1
  for (;;) {
    const res = await payload.find({
      collection: 'posts',
      where,
      limit: 500,
      page,
      depth: 0,
      overrideAccess: true,
    })
    for (const p of res.docs) {
      if (p.slug) urls.push(urlDoPost(p.slug))
    }
    if (!res.hasNextPage) break
    page += 1
  }

  return urls
}

const urls = await coletarUrls()

console.log(`Chave:    ${INDEXNOW_KEY}`)
console.log(`Arquivo:  ${SITE}/${INDEXNOW_KEY}.txt`)
console.log(`URLs:     ${urls.length}${DIAS ? ` (alteradas nos ultimos ${DIAS} dias)` : ''}`)

if (DRY) {
  console.log('\nDRY=1 — nada foi enviado. Amostra:')
  for (const u of urls.slice(0, 10)) console.log('  ' + u)
  if (urls.length > 10) console.log(`  ... e mais ${urls.length - 10}`)
  process.exit(0)
}

if (urls.length === 0) {
  console.log('Nada a enviar.')
  process.exit(0)
}

const r = await enviarIndexNow(urls)

for (const lote of r.lotes) {
  console.log(`Lote de ${lote.urls} URL(s) -> HTTP ${lote.status} ${lote.ok ? 'OK' : 'FALHOU'}`)
}
if (r.ignoradas.length) {
  console.log(`${r.ignoradas.length} URL(s) ignorada(s) por nao pertencerem ao dominio.`)
}

const falhou = r.lotes.some((l) => !l.ok)
console.log(falhou ? '\nAlgum lote falhou — ver codigo HTTP acima.' : `\n${r.enviadas} URL(s) aceitas.`)
process.exit(falhou ? 1 : 0)
