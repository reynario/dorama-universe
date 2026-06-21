import { getApprovedComments, getCategories, getPosts } from '@/lib/api'
import type { Post } from '@/lib/types'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import FeaturedPost from '@/components/FeaturedPost'
import PostCard from '@/components/PostCard'
import AdSlot from '@/components/AdSlot'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ categoria?: string; q?: string }> }

export default async function HomePage({ searchParams }: Props) {
  const { categoria, q } = await searchParams
  const { docs: categories } = await getCategories()
  const cat = categoria ? categories.find((c) => c.slug === categoria) : undefined

  const [{ docs: posts }, { docs: comments }] = await Promise.all([
    getPosts({ categoryId: cat?.id, q }),
    getApprovedComments(),
  ])

  const counts = new Map<number, number>()
  for (const c of comments) {
    const id = typeof c.post === 'number' ? c.post : c.post?.id
    if (typeof id === 'number') counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const countFor = (p: Post) => counts.get(p.id) ?? 0

  const featured = posts.find((p) => p.featured) ?? posts[0]
  const rest = posts.filter((p) => p.id !== featured?.id)

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
            <section className="section">
              <h2 className="section__title">Novidades em destaque no Hallyu</h2>
              {featured && <FeaturedPost post={featured} commentCount={countFor(featured)} />}
            </section>

            <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />

            <section className="section">
              <h2 className="section__title">Todas as publicações recentes</h2>
              <div className="grid">
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} commentCount={countFor(post)} />
                ))}
              </div>
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
