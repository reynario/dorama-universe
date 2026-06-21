import 'dotenv/config'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} = require('../node_modules/.pnpm/@aws-sdk+client-s3@3.1073.0/node_modules/@aws-sdk/client-s3')

const { R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env

console.log('Bucket:  ', R2_BUCKET)
console.log('Endpoint:', R2_ENDPOINT)
console.log('Key ID:  ', R2_ACCESS_KEY_ID?.slice(0, 6) + '...')

const client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const key = `__healthcheck-${Date.now()}.txt`

try {
  console.log('\n[1/4] HEAD bucket (existe + acesso)...')
  await client.send(new HeadBucketCommand({ Bucket: R2_BUCKET }))
  console.log('      OK')

  console.log('[2/4] PUT objeto de teste...')
  await client.send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: 'dorama-universe ok', ContentType: 'text/plain' }),
  )
  console.log('      OK ->', key)

  console.log('[3/4] GET objeto de teste...')
  const got = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  const body = await got.Body.transformToString()
  console.log('      OK -> conteudo:', JSON.stringify(body))

  console.log('[4/4] DELETE objeto de teste...')
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  console.log('      OK')

  console.log('\n✅ R2 conectado e com permissao de leitura/gravacao.')
  process.exit(0)
} catch (err) {
  console.error('\n❌ Falha no R2:', err.name, '-', err.message)
  if (err.$metadata) console.error('   HTTP status:', err.$metadata.httpStatusCode)
  process.exit(1)
}
