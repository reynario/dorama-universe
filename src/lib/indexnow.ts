// IndexNow: avisa os buscadores no instante em que um post e publicado ou
// editado, em vez de esperar o rastreamento passivo do sitemap.
//
// Um unico envio atende Bing, Yandex, Seznam e Naver — todos compartilham a
// mesma malha. O Naver interessa especialmente aqui: e o buscador dominante na
// Coreia e o nicho do blog e conteudo coreano.
//
// O Google NAO participa do IndexNow. Para ele continua valendo o sitemap.

// A chave e publica por definicao: o protocolo exige que ela fique acessivel em
// https://doramauniverse.com/<chave>.txt para provar que quem envia controla o
// dominio. Por isso fica no codigo mesmo, e nao no .env — nao ha o que proteger,
// e assim o arquivo estatico do frontend e este valor nunca saem de sincronia.
export const INDEXNOW_KEY = '9af3ff39c1d2721126b35ab7956b8a75'

const ENDPOINT = 'https://api.indexnow.org/IndexNow'

// Limite do protocolo por requisicao.
const MAX_POR_LOTE = 10_000

export type ResultadoIndexNow = {
  enviadas: number
  lotes: { status: number; ok: boolean; urls: number }[]
  ignoradas: string[]
}

function siteBase(): URL | null {
  const bruto = process.env.FRONTEND_URL || 'https://doramauniverse.com'
  try {
    const url = new URL(bruto)
    // Em desenvolvimento o FRONTEND_URL aponta para localhost. Enviar isso ao
    // IndexNow devolveria 422 (host nao corresponde) e, pior, poluiria a conta
    // com tentativas invalidas. Melhor nao chamar.
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null
    return url
  } catch {
    return null
  }
}

/**
 * Envia uma lista de URLs ao IndexNow. Lanca em erro de rede — quem chama
 * decide se isso e fatal (script) ou apenas registrado (hook de publicacao).
 */
export async function enviarIndexNow(urls: string[]): Promise<ResultadoIndexNow> {
  const base = siteBase()
  if (!base) {
    return { enviadas: 0, lotes: [], ignoradas: urls }
  }

  const host = base.hostname
  const ignoradas: string[] = []
  const validas: string[] = []

  // O IndexNow recusa o lote inteiro (422) se uma unica URL for de outro host,
  // entao filtramos antes em vez de descobrir isso no retorno.
  for (const u of new Set(urls)) {
    try {
      if (new URL(u).hostname === host) validas.push(u)
      else ignoradas.push(u)
    } catch {
      ignoradas.push(u)
    }
  }

  const lotes: ResultadoIndexNow['lotes'] = []

  for (let i = 0; i < validas.length; i += MAX_POR_LOTE) {
    const urlList = validas.slice(i, i + MAX_POR_LOTE)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${base.origin}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    })
    // 200 = aceito; 202 = aceito, chave ainda em validacao (normal nas
    // primeiras horas apos publicar o arquivo da chave).
    lotes.push({ status: res.status, ok: res.status === 200 || res.status === 202, urls: urlList.length })
  }

  return { enviadas: validas.length, lotes, ignoradas }
}

/** Monta a URL publica de um post a partir do slug. */
export function urlDoPost(slug: string): string {
  const base = siteBase()
  return `${base ? base.origin : 'https://doramauniverse.com'}/posts/${slug}`
}

/**
 * Versao "dispare e esqueca" para usar dentro de hooks do Payload: nunca lanca,
 * porque uma indisponibilidade do IndexNow nao pode derrubar o salvamento de um
 * post no painel.
 */
export function pingIndexNow(urls: string[], contexto = ''): void {
  void enviarIndexNow(urls)
    .then((r) => {
      if (r.enviadas === 0) return
      const falhou = r.lotes.filter((l) => !l.ok)
      if (falhou.length) {
        console.warn(`[indexnow] ${contexto} falhou:`, falhou.map((l) => l.status).join(', '))
      } else {
        console.log(`[indexnow] ${contexto} ${r.enviadas} URL(s) enviada(s)`)
      }
    })
    .catch((err) => {
      console.warn('[indexnow] erro de rede:', err instanceof Error ? err.message : err)
    })
}
