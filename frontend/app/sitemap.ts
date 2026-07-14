import type { MetadataRoute } from 'next'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const SITE = 'https://doramauniverse.com'

export const revalidate = 3600 // regenera no maximo a cada 1h

type LeanPost = { slug: string; updatedAt?: string }
type LeanCat = { slug: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
  ]

  try {
    // categorias (abas)
    const catRes = await fetch(`${API}/api/categories?limit=50&depth=0&select[slug]=true`, {
      next: { revalidate: 3600 },
    })
    if (catRes.ok) {
      const { docs } = (await catRes.json()) as { docs: LeanCat[] }
      for (const c of docs) {
        entries.push({
          url: `${SITE}/?categoria=${c.slug}`,
          changeFrequency: 'daily',
          priority: 0.6,
        })
      }
    }

    // todos os posts publicados (payload leve via select)
    const postRes = await fetch(
      `${API}/api/posts?where[_status][equals]=published&limit=5000&depth=0&select[slug]=true&select[updatedAt]=true`,
      { next: { revalidate: 3600 } },
    )
    if (postRes.ok) {
      const { docs } = (await postRes.json()) as { docs: LeanPost[] }
      for (const p of docs) {
        entries.push({
          url: `${SITE}/posts/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    }
  } catch {
    // se a API estiver indisponivel, publica ao menos a home
  }

  return entries
}
