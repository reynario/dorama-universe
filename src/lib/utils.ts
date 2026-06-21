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
