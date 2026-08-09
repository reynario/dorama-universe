import { notFound } from 'next/navigation'
import { loadFeed } from '@/lib/feed'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import PostFeed from '@/components/PostFeed'
import SiteFooter from '@/components/SiteFooter'

// Categorias em caminho proprio. Antes eram /?categoria=<slug>: variacoes da
// home por query param, sem canonical e sem paginacao, o que deixava a maior
// parte do acervo de cada categoria inalcancavel por link interno.
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const feed = await loadFeed({ categorySlug: slug, page: 1 })
  if (!feed?.category) return {}
  return {
    title: `${feed.category.name} — Dorama Universe`,
    description: `Notícias, resenhas e novidades de ${feed.category.name} no universo Hallyu.`,
    alternates: { canonical: `/categoria/${feed.category.slug}` },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const feed = await loadFeed({ categorySlug: slug, page: 1 })
  if (!feed?.category) notFound()

  return (
    <>
      <Header />
      <CategoryTabs categories={feed.categories} active={feed.category.slug} />

      <main className="container page">
        <h1 className="page-title">{feed.category.name}</h1>
        <PostFeed
          feed={feed}
          heading={`Tudo sobre ${feed.category.name}`}
          emptyTitle={`Nada em ${feed.category.name} ainda`}
          emptyText="Em breve, novidades nesta categoria."
          pageHref={(p) => (p === 1 ? `/categoria/${slug}` : `/categoria/${slug}/pagina/${p}`)}
        />
      </main>

      <SiteFooter />
    </>
  )
}
