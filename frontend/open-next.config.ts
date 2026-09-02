import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache'
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue'

// Configuracao do adaptador OpenNext para rodar o Next.js na Cloudflare.
//
// incrementalCache: sem isso o adaptador roda "stateless" — nem o ISR das
// paginas nem o cache de fetch do Next persistem, e cada requisicao vai ate a
// API do Payload. O cache durável fica no R2 (binding NEXT_INC_CACHE_R2_BUCKET
// no wrangler.jsonc), com a Cache API regional na frente para evitar a ida ao
// R2 em cada hit.
//
// Por que R2 e nao KV: o plano free do KV permite so 1.000 gravacoes por dia.
// Com ~12 mil requisicoes/dia (quase tudo robo) e ~2 gravacoes por pagina
// renderizada, a cota acabava em ~1h e o site ficava o resto do dia sem cache
// (e o deploy falhava com o erro 10048). O R2 nao tem teto diario e da 1 milhao
// de gravacoes gratis por mes.
//
// queue: e a fila que regenera em segundo plano uma pagina ISR vencida. Sem
// ela o adaptador usa uma fila "dummy" que so loga o erro
// "Dummy queue is not implemented" e a pagina nunca e renovada sozinha.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  queue: memoryQueue,
})
