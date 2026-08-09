import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache'
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache'

// Configuracao do adaptador OpenNext para rodar o Next.js na Cloudflare.
//
// incrementalCache: sem isso o adaptador roda "stateless" — nem o ISR das
// paginas nem o cache de fetch do Next persistem, e cada requisicao vai ate a
// API do Payload. Usamos o KV (binding NEXT_INC_CACHE_KV no wrangler.jsonc)
// como cache durável, com a Cache API regional na frente para evitar a ida ao
// KV em cada hit.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: 'long-lived' }),
})
