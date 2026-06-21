import 'dotenv/config'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { S3Client, ListObjectsV2Command } = require(
  '../node_modules/.pnpm/@aws-sdk+client-s3@3.1073.0/node_modules/@aws-sdk/client-s3',
)

const { R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env
const client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const r = await client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 50 }))
console.log('Objetos no bucket:', r.KeyCount)
for (const o of r.Contents || []) console.log('  ', o.Key, `(${o.Size}b)`)
