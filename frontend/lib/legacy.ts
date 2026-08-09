import { notFound, permanentRedirect } from 'next/navigation'
import { getPostBySlug } from './api'

/**
 * Redirect das URLs do WordPress antigo para as novas.
 *
 * Ate a migracao de 2026-06-21 os posts moravam na raiz do dominio
 * (doramauniverse.com/serie-coreana-chocolate/) e as traducoes em /es/<slug>/.
 * No Payload eles passaram a viver em /posts/<slug>, e as URLs antigas ficaram
 * devolvendo 404 — jogando fora o historico e a autoridade que o Google ja
 * tinha nelas. Aqui devolvemos um 308 permanente para o endereco novo.
 *
 * A consulta e feita no Payload em vez de uma tabela fixa de redirects porque
 * o importador rodou slugify() em cima do post_name do WordPress: nem todo
 * slug antigo virou post, e o mapa ficaria desatualizado a cada novo post.
 */

// Caminhos de um segmento que nunca sao slug de post. Filtrar aqui evita uma
// chamada na API a cada varredura de bot atras de /wp-login.php e afins.
const RESERVED = new Set([
  'posts',
  'preview',
  'api',
  'admin',
  'wp-admin',
  'wp-login',
  'wp-content',
  'wp-includes',
  'feed',
  'es',
  'categoria',
  'pagina',
  '_next',
])

export async function redirectLegacyPost(rawSlug: string): Promise<never> {
  let slug: string
  try {
    slug = decodeURIComponent(rawSlug).toLowerCase()
  } catch {
    notFound()
  }

  // Slug vazio, nome de arquivo (.php, .xml, .ico) ou rota reservada: 404 seco,
  // sem consultar o Payload.
  if (!slug || slug.includes('.') || RESERVED.has(slug)) notFound()

  // Se a API estiver fora, o erro sobe e vira 5xx. E de proposito: um 404 aqui
  // faria o Google desindexar a URL, e um 5xx so o faz tentar de novo depois.
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  permanentRedirect(`/posts/${post.slug}`)
}
