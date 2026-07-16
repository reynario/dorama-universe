import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Tags } from './collections/Tags'
import { Categories } from './collections/Categories'
import { Authors } from './collections/Authors'
import { Posts } from './collections/Posts'
import { Comments } from './collections/Comments'
import { Leads } from './collections/Leads'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Posts, Categories, Authors, Tags, Comments, Media, Users, Leads],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  // URL publica do backend (Portainer). Usada pra montar links absolutos.
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  // Libera o frontend (Cloudflare Pages) a consumir a API e enviar comentarios.
  // FRONTEND_URL = dominio do site publico (ex.: https://doramauniverse.com)
  cors: [process.env.FRONTEND_URL, process.env.PAYLOAD_PUBLIC_SERVER_URL].filter(
    Boolean,
  ) as string[],
  csrf: [process.env.FRONTEND_URL, process.env.PAYLOAD_PUBLIC_SERVER_URL].filter(
    Boolean,
  ) as string[],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    // Cloudflare R2 (API compativel com S3) para armazenar os uploads da collection "media".
    // So entra em acao quando as variaveis R2_* estiverem preenchidas no .env.
    s3Storage({
      enabled: Boolean(process.env.R2_BUCKET),
      collections: {
        media: true,
      },
      bucket: process.env.R2_BUCKET || '',
      config: {
        endpoint: process.env.R2_ENDPOINT,
        region: 'auto',
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: true,
      },
    }),
  ],
})
