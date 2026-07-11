import type { Category, Comment, Paginated, Post } from './types'

// URL do backend Payload (Portainer). Definida no build da Cloudflare.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`API ${res.status} em ${path}`)
  return res.json() as Promise<T>
}

export function getCategories() {
  return api<Paginated<Category>>(`/api/categories?sort=createdAt&limit=50&depth=0`)
}

export function getPosts(
  opts: { categoryId?: number; q?: string; limit?: number; page?: number } = {},
) {
  const p = new URLSearchParams()
  p.set('where[_status][equals]', 'published')
  if (opts.categoryId) p.set('where[category][equals]', String(opts.categoryId))
  if (opts.q) {
    p.set('where[or][0][title][like]', opts.q)
    p.set('where[or][1][excerpt][like]', opts.q)
  }
  p.set('sort', '-publishedAt')
  p.set('depth', '2')
  p.set('limit', String(opts.limit ?? 30))
  if (opts.page && opts.page > 1) p.set('page', String(opts.page))
  return api<Paginated<Post>>(`/api/posts?${p.toString()}`)
}

// "Leia tambem": posts recentes da mesma categoria, excluindo o atual.
export function getRelated(categoryId: number, excludeId: number, limit = 3) {
  const p = new URLSearchParams()
  p.set('where[and][0][category][equals]', String(categoryId))
  p.set('where[and][1][id][not_equals]', String(excludeId))
  p.set('where[and][2][_status][equals]', 'published')
  p.set('sort', '-publishedAt')
  p.set('depth', '2')
  p.set('limit', String(limit))
  return api<Paginated<Post>>(`/api/posts?${p.toString()}`)
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const p = new URLSearchParams()
  p.set('where[slug][equals]', slug)
  p.set('where[_status][equals]', 'published')
  p.set('depth', '2')
  p.set('limit', '1')
  const res = await api<Paginated<Post>>(`/api/posts?${p.toString()}`)
  return res.docs[0] ?? null
}

export function getComments(postId: number) {
  const p = new URLSearchParams()
  p.set('where[post][equals]', String(postId))
  p.set('where[approved][equals]', 'true')
  p.set('sort', '-createdAt')
  p.set('depth', '0')
  p.set('limit', '100')
  return api<Paginated<Comment>>(`/api/comments?${p.toString()}`)
}

// Busca todos os comentarios aprovados (depth 0) para contar por post na home.
export async function getApprovedComments() {
  return api<Paginated<Comment>>(
    `/api/comments?where[approved][equals]=true&depth=0&limit=1000`,
  )
}

export async function postComment(data: { post: number; authorName: string; content: string }) {
  const res = await fetch(`${API}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.ok
}
