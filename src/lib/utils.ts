import type { Media } from '@/payload-types'

// Formata data como "20 DE JUNHO" (estilo do layout K-SPACE).
export function formatDateLong(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' })
    .format(d)
    .toUpperCase()
}

// Data curta "20/06/2026" para usos secundarios.
export function formatDateShort(value?: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

// Extrai a URL de um campo de upload (pode vir como id ou objeto populado).
export function mediaUrl(media?: number | Media | null): string | null {
  if (!media || typeof media === 'number') return null
  return media.url ?? null
}

export function mediaAlt(media?: number | Media | null, fallback = ''): string {
  if (!media || typeof media === 'number') return fallback
  return media.alt ?? fallback
}

// Prepara o HTML importado do WordPress para exibicao: normaliza URLs de midia
// antigas e converte links soltos do YouTube em players incorporados.
export function prepareContentHtml(html?: string | null): string {
  if (!html) return ''
  const out = html.split('http://localhost:3000/api/media/file/').join('/api/media/file/')
  return out.replace(
    /(^|>|\s)https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})[^\s<]*/g,
    (_m, prefix: string, id: string) =>
      `${prefix}<span class="video-embed"><iframe src="https://www.youtube.com/embed/${id}" title="Vídeo do YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></span>`,
  )
}
