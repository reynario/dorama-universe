import { getApprovedComments, getCategories, getPosts } from './api'
import type { Category, Post } from './types'

// Dados de uma listagem de posts (home, /pagina/N, /categoria/<slug>...).
// Concentrado aqui para a home e as paginas de categoria nao duplicarem a
// montagem da contagem de comentarios e do estado de paginacao.
export type Feed = {
  categories: Category[]
  category?: Category
  posts: Post[]
  commentCount: (post: Post) => number
  currentPage: number
  totalPages: number
}

/** Devolve null quando o slug de categoria pedido nao existe (vira 404). */
export async function loadFeed(opts: {
  categorySlug?: string
  q?: string
  page?: number
}): Promise<Feed | null> {
  const page = opts.page ?? 1
  const { docs: categories } = await getCategories()

  let category: Category | undefined
  if (opts.categorySlug) {
    category = categories.find((c) => c.slug === opts.categorySlug)
    if (!category) return null
  }

  const [postsRes, { docs: comments }] = await Promise.all([
    getPosts({ categoryId: category?.id, q: opts.q, page }),
    getApprovedComments(),
  ])

  const counts = new Map<number, number>()
  for (const c of comments) {
    const id = typeof c.post === 'number' ? c.post : c.post?.id
    if (typeof id === 'number') counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return {
    categories,
    category,
    posts: postsRes.docs,
    commentCount: (post) => counts.get(post.id) ?? 0,
    currentPage: postsRes.page ?? page,
    totalPages: postsRes.totalPages ?? 1,
  }
}
