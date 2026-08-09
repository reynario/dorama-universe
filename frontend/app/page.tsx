import { permanentRedirect } from 'next/navigation'
import { loadFeed } from '@/lib/feed'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import PostFeed from '@/components/PostFeed'
import SiteFooter from '@/components/SiteFooter'

// A home le searchParams (?q= da busca), entao continua sendo renderizada por
// requisicao — mas sem 'force-dynamic' as chamadas da API passam a usar o cache
// de fetch do Next, agora persistido no KV.
export const revalidate = 60

type Props = { searchParams: Promise<{ categoria?: string; q?: string; page?: string }> }

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams
  // Resultado de busca e conteudo raso e infinito em variacoes: fica fora do
  // indice, mas os links continuam sendo seguidos.
  if (q) {
    return {
      title: `Busca: ${q} — Dorama Universe`,
      robots: { index: false, follow: true },
    }
  }
  return { alternates: { canonical: '/' } }
}

export default async function HomePage({ searchParams }: Props) {
  const { categoria, q, page: pageParam } = await searchParams

  // As categorias e a paginacao migraram de query param para caminho proprio
  // (/categoria/<slug> e /pagina/<n>). As URLs antigas ja estavam no sitemap e
  // podem estar indexadas, entao apontam para o endereco novo com 308.
  if (categoria) permanentRedirect(`/categoria/${categoria}`)
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  // A busca continua paginando por query param: ela e noindex e o /pagina/<n>
  // nao carrega o termo pesquisado.
  if (page > 1 && !q) permanentRedirect(`/pagina/${page}`)

  const feed = await loadFeed({ q, page })

  return (
    <>
      <Header />
      <CategoryTabs categories={feed?.categories ?? []} />

      <main className="container page">
        {feed && (
          <PostFeed
            feed={feed}
            heading={q ? `Resultados para “${q}”` : 'Todas as publicações recentes'}
            emptyTitle="Nenhuma publicação ainda"
            emptyText={q ? 'Nada encontrado para essa busca.' : 'Em breve, novidades do universo Hallyu.'}
            pageHref={(p) =>
              q
                ? `/?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ''}`
                : p === 1
                  ? '/'
                  : `/pagina/${p}`
            }
            showFeatured={!q}
          />
        )}
      </main>

      <SiteFooter />
    </>
  )
}
