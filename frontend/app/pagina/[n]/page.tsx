import { notFound, permanentRedirect } from 'next/navigation'
import { loadFeed } from '@/lib/feed'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import PostFeed from '@/components/PostFeed'
import SiteFooter from '@/components/SiteFooter'
import { parsePageParam } from '@/lib/feed-paging'

// Paginas 2..N do arquivo. Ficam em caminho proprio em vez de /?page=N para
// serem cacheaveis por ISR (nao dependem de searchParams) e para terem
// canonical proprio — como query param na home, o Google as tratava como
// variacoes da home e nao descia por elas ate os posts antigos.
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ n: string }> }

export async function generateMetadata({ params }: Props) {
  const { n } = await params
  const page = parsePageParam(n)
  if (!page) return {}
  return {
    title: `Publicações — página ${page} — Dorama Universe`,
    alternates: { canonical: `/pagina/${page}` },
  }
}

export default async function ArchivePage({ params }: Props) {
  const { n } = await params
  const page = parsePageParam(n)
  if (!page) notFound()
  // /pagina/1 duplicaria a home.
  if (page === 1) permanentRedirect('/')

  const feed = await loadFeed({ page })
  if (!feed || feed.posts.length === 0) notFound()

  return (
    <>
      <Header />
      <CategoryTabs categories={feed.categories} />

      <main className="container page">
        <PostFeed
          feed={feed}
          heading={`Publicações — página ${feed.currentPage}`}
          emptyTitle="Nenhuma publicação nesta página"
          emptyText="Volte para a home para ver as novidades."
          pageHref={(p) => (p === 1 ? '/' : `/pagina/${p}`)}
        />
      </main>

      <SiteFooter />
    </>
  )
}
