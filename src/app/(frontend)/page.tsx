import { getPayload } from 'payload'
import type { Where } from 'payload'
import Link from 'next/link'
import config from '@/payload.config'
import type { Post } from '@/payload-types'

import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import FeaturedPost from '@/components/FeaturedPost'
import PostCard from '@/components/PostCard'
import AdSlot from '@/components/AdSlot'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ categoria?: string; q?: string; page?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const { categoria, q, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const payload = await getPayload({ config })

  // Categorias (abas)
  const { docs: categories } = await payload.find({
    collection: 'categories',
    sort: 'createdAt',
    limit: 50,
  })

  // Filtro por categoria (slug) e busca textual simples
  const where: Where = { _status: { equals: 'published' } }
  if (categoria) {
    const cat = categories.find((c) => c.slug === categoria)
    if (cat) where.category = { equals: cat.id }
  }
  if (q) {
    where.or = [
      { title: { like: q } },
      { excerpt: { like: q } },
    ]
  }

  const {
    docs: posts,
    totalPages,
    page: currentPage,
  } = await payload.find({
    collection: 'posts',
    where,
    sort: '-publishedAt',
    depth: 2,
    limit: 30,
    page,
  })

  // Contagem de comentarios aprovados por post
  const { docs: comments } = await payload.find({
    collection: 'comments',
    where: { approved: { equals: true } },
    depth: 0,
    limit: 1000,
  })
  const commentCounts = new Map<number, number>()
  for (const c of comments) {
    const id = typeof c.post === 'number' ? c.post : c.post?.id
    if (typeof id === 'number') commentCounts.set(id, (commentCounts.get(id) ?? 0) + 1)
  }
  const countFor = (p: Post) => commentCounts.get(p.id) ?? 0

  // Destaque so na primeira pagina; nas demais, o grid ocupa tudo
  const isFirstPage = (currentPage ?? 1) === 1
  const featured = isFirstPage ? (posts.find((p) => p.featured) ?? posts[0]) : undefined
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts

  // Monta o link de paginacao preservando filtro/busca
  const pageHref = (p: number) => {
    const u = new URLSearchParams()
    if (categoria) u.set('categoria', categoria)
    if (q) u.set('q', q)
    if (p > 1) u.set('page', String(p))
    const s = u.toString()
    return s ? `/?${s}` : '/'
  }

  return (
    <>
      <Header />
      <CategoryTabs categories={categories} active={categoria} />

      <main className="container page">
        {posts.length === 0 ? (
          <div className="empty">
            <h1>Nenhuma publicação ainda</h1>
            <p>
              {q || categoria
                ? 'Nada encontrado para esse filtro.'
                : 'Crie seu primeiro post no painel administrativo para vê-lo aqui.'}
            </p>
            <a className="btn btn--admin" href="/admin">
              Ir para o painel
            </a>
          </div>
        ) : (
          <>
            {featured && (
              <>
                <section className="section">
                  <h2 className="section__title">Novidades em destaque no Hallyu</h2>
                  <FeaturedPost post={featured} commentCount={countFor(featured)} />
                </section>

                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} label="Anúncio" />
              </>
            )}

            <section className="section">
              <h2 className="section__title">
                {isFirstPage ? 'Todas as publicações recentes' : `Publicações — página ${currentPage}`}
              </h2>
              <div className="grid">
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} commentCount={countFor(post)} />
                ))}
              </div>

              {(totalPages ?? 1) > 1 && (
                <nav className="pagination" aria-label="Paginação">
                  {(currentPage ?? 1) > 1 && (
                    <Link href={pageHref((currentPage ?? 1) - 1)} className="page-btn">
                      ← Anterior
                    </Link>
                  )}
                  <span className="page-info">
                    Página {currentPage} de {totalPages}
                  </span>
                  {(currentPage ?? 1) < (totalPages ?? 1) && (
                    <Link href={pageHref((currentPage ?? 1) + 1)} className="page-btn">
                      Próxima →
                    </Link>
                  )}
                </nav>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>Dorama Universe — Doramas &amp; K-Pop · O universo Hallyu em um só lugar.</p>
        </div>
      </footer>
    </>
  )
}
