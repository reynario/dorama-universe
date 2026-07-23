import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getComments, getDraftPost, getRelated } from '@/lib/api'
import type { Category } from '@/lib/types'
import Header from '@/components/Header'
import ArticleView from '@/components/ArticleView'

// Pre-visualizacao de rascunho, aberta pelo botao "Preview" do painel do
// Payload. A pagina busca a versao draft na API usando o token de sessao que
// vem na URL — sem estar logado no painel, o link nao mostra nada.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pré-visualização — Dorama Universe',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function PreviewPage({ params, searchParams }: Props) {
  const { id } = await params
  const { token } = await searchParams
  if (!token) notFound()

  const post = await getDraftPost(id, token)

  if (!post) {
    return (
      <>
        <Header />
        <article className="article">
          <h1 className="article__title">Pré-visualização indisponível</h1>
          <p className="article__excerpt">
            O link pode ter expirado ou o post não existe mais. Abra o post no painel e clique em
            &quot;Preview&quot; novamente.
          </p>
          <Link href="/" className="article__back">
            ← Ir para a home
          </Link>
        </article>
      </>
    )
  }

  const category = post.category as Category | undefined
  const [{ docs: comments, totalDocs }, { docs: related }] = await Promise.all([
    getComments(post.id),
    category ? getRelated(category.id, post.id) : Promise.resolve({ docs: [] as never[] }),
  ])

  return (
    <>
      <div className="preview-banner">
        👁 Pré-visualização de rascunho — esta página não está publicada e só é visível por este
        link.
      </div>
      <Header />
      <ArticleView post={post} comments={comments} totalDocs={totalDocs} related={related} />

      <footer className="site-footer">
        <div className="container">
          <p>Dorama Universe — Doramas &amp; K-Pop · O universo Hallyu em um só lugar.</p>
        </div>
      </footer>
    </>
  )
}
