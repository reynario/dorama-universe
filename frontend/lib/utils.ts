import type { Media } from './types'

const API = process.env.NEXT_PUBLIC_API_URL || ''
// Dominio publico do R2 (opcional). Se definido, as imagens vem direto da CDN.
const MEDIA = process.env.NEXT_PUBLIC_MEDIA_BASE || ''

export function formatDateLong(value?: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' })
    .format(new Date(value))
    .toUpperCase()
}

// Resolve a URL absoluta de uma imagem (relacao de upload do Payload).
export function mediaUrl(m?: Media | number | null): string | null {
  if (!m || typeof m === 'number') return null
  if (MEDIA && m.filename) return `${MEDIA}/${m.filename}`
  if (m.url) return m.url.startsWith('http') ? m.url : `${API}${m.url}`
  return null
}

export function mediaAlt(m?: Media | number | null, fallback = ''): string {
  if (!m || typeof m === 'number') return fallback
  return m.alt ?? fallback
}

// Converte URLs soltas do YouTube (como o WordPress fazia com oEmbed) em
// players incorporados. So converte quando a URL aparece como texto (nao
// dentro de href/src).
function embedYouTube(html: string): string {
  return html.replace(
    /(^|>|\s)https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})[^\s<]*/g,
    (_m, prefix: string, id: string) =>
      `${prefix}<span class="video-embed"><iframe src="https://www.youtube.com/embed/${id}" title="Vídeo do YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></span>`,
  )
}

// Prepara o HTML importado para exibicao:
//  - normaliza URLs de midia (inclusive absolutas antigas com localhost)
//  - aponta as imagens para a CDN do R2 ou para o backend
//  - converte links soltos do YouTube em players
export function fixContentImages(html?: string | null): string {
  if (!html) return ''
  let out = html
    .split('http://localhost:3000/api/media/file/')
    .join('/api/media/file/')
  out = MEDIA
    ? out.split('/api/media/file/').join(`${MEDIA}/`)
    : out.split('/api/media/file/').join(`${API}/api/media/file/`)
  return embedYouTube(out)
}
