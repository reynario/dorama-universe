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

// Reescreve as imagens dentro do HTML importado (que vem como /api/media/file/...)
// para a URL absoluta correta (CDN do R2 ou backend).
export function fixContentImages(html?: string | null): string {
  if (!html) return ''
  if (MEDIA) return html.split('/api/media/file/').join(`${MEDIA}/`)
  return html.split('/api/media/file/').join(`${API}/api/media/file/`)
}
