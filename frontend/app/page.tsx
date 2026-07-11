import Link from 'next/link'
import { getApprovedComments, getCategories, getPosts } from '@/lib/api'
import type { Post } from '@/lib/types'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import FeaturedPost from '@/components/FeaturedPost'
import PostCard from '@/components/PostCard'
import AdSlot from '@/components/AdSlot'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ categoria?: string; q?: string; page?: string }> }

export default async function HomePage({ searchParams }: Props) {
  const { categoria, q, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const { docs: categories } = await getCategories()
  const cat = categoria ? categories.find((c) => c.slug === categoria) : undefined

  const [postsRes, { docs: comments }] = await Promise.all([
    getPosts({ categoryId: cat?.id, q, page }),
    getApprovedComments(),
  ])
  const { docs: posts, totalPages, page: currentPage } = postsRes

  const counts = new Map<number, number>()
  for (const c of comments) {
    const id = typeof c.post === 'number' ? c.post : c.post?.id
    if (typeof id === 'number') counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const countFor = (p: Post) => counts.get(p.id) ?? 0

  // Destaque so na primeira pagina
  const isFirstPage = (currentPage ?? 1) === 1
  const featured = isFirstPage ? (posts.find((p) => p.featured) ?? posts[0]) : undefined
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts

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
                : 'Em breve, novidades do universo Hallyu.'}
            </p>
          </div>
        ) : (
          <>
            {featured && (
              <>
                <section className="section">
                  <h2 className="section__title">Novidades em destaque no Hallyu</h2>
                  <FeaturedPost post={featured} commentCount={countFor(featured)} />
                </section>

                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />
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
