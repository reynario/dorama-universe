import { notFound, permanentRedirect } from 'next/navigation'
import { loadFeed } from '@/lib/feed'
import { parsePageParam } from '@/lib/feed-paging'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import PostFeed from '@/components/PostFeed'
import SiteFooter from '@/components/SiteFooter'

// Paginas 2..N de uma categoria.
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string; n: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug, n } = await params
  const page = parsePageParam(n)
  if (!page) return {}
  const feed = await loadFeed({ categorySlug: slug, page })
  if (!feed?.category) return {}
  return {
    title: `${feed.category.name} — página ${page} — Dorama Universe`,
    alternates: { canonical: `/categoria/${feed.category.slug}/pagina/${page}` },
  }
}

export default async function CategoryArchivePage({ params }: Props) {
  const { slug, n } = await params
  const page = parsePageParam(n)
  if (!page) notFound()
  if (page === 1) permanentRedirect(`/categoria/${slug}`)

  const feed = await loadFeed({ categorySlug: slug, page })
  if (!feed?.category || feed.posts.length === 0) notFound()

  return (
    <>
      <Header />
      <CategoryTabs categories={feed.categories} active={feed.category.slug} />

      <main className="container page">
        <h1 className="page-title">
          {feed.category.name} — página {feed.currentPage}
        </h1>
        <PostFeed
          feed={feed}
          heading={`Tudo sobre ${feed.category.name}`}
          emptyTitle={`Nada em ${feed.category.name} nesta página`}
          emptyText="Volte para a primeira página da categoria."
          pageHref={(p) => (p === 1 ? `/categoria/${slug}` : `/categoria/${slug}/pagina/${p}`)}
        />
      </main>

      <SiteFooter />
    </>
  )
}
