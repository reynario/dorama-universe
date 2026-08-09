import type { Feed } from '@/lib/feed'
import AdSlot from './AdSlot'
import FeaturedPost from './FeaturedPost'
import Pagination from './Pagination'
import PostCard from './PostCard'

// Listagem de posts compartilhada pela home, pelas paginas de arquivo
// (/pagina/N) e pelas de categoria.
export default function PostFeed({
  feed,
  heading,
  emptyTitle,
  emptyText,
  pageHref,
  showFeatured = false,
}: {
  feed: Feed
  heading: string
  emptyTitle: string
  emptyText: string
  pageHref: (page: number) => string
  showFeatured?: boolean
}) {
  const { posts, commentCount, currentPage, totalPages } = feed

  if (posts.length === 0) {
    return (
      <div className="empty">
        <h1>{emptyTitle}</h1>
        <p>{emptyText}</p>
      </div>
    )
  }

  // O destaque so faz sentido na primeira pagina de uma listagem sem filtro.
  const featured = showFeatured ? (posts.find((p) => p.featured) ?? posts[0]) : undefined
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts

  return (
    <>
      {featured && (
        <>
          <section className="section">
            <h2 className="section__title">Novidades em destaque no Hallyu</h2>
            <FeaturedPost post={featured} commentCount={commentCount(featured)} />
          </section>

          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />
        </>
      )}

      <section className="section">
        <h2 className="section__title">{heading}</h2>
        <div className="grid">
          {rest.map((post) => (
            <PostCard key={post.id} post={post} commentCount={commentCount(post)} />
          ))}
        </div>

        <Pagination current={currentPage} total={totalPages} href={pageHref} />
      </section>
    </>
  )
}
