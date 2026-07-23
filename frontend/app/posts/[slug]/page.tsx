import { notFound } from 'next/navigation'
import { getComments, getPostBySlug, getRelated } from '@/lib/api'
import type { Author, Category, Tag } from '@/lib/types'
import Header from '@/components/Header'
import ArticleView from '@/components/ArticleView'
import { mediaUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const SITE_URL = 'https://doramauniverse.com'

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Post não encontrado — Dorama Universe' }
  // Compartilhamentos usam a versao social da capa (com titulo/marca);
  // sem ela, cai na capa normal.
  const hero = mediaUrl(post.ogImage) || mediaUrl(post.heroImage)
  // Campos de SEO dedicados (preenchidos pelo robo de conteudo ou no admin);
  // sem eles, cai no titulo/resumo do post.
  const metaTitle = post.seo?.metaTitle || post.title
  const metaDescription = post.seo?.metaDescription || post.excerpt
  return {
    title: `${metaTitle} — Dorama Universe`,
    description: metaDescription,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      url: `/posts/${post.slug}`,
      images: hero ? [{ url: hero }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: hero ? [hero] : undefined,
    },
  }
}

// Dados estruturados (JSON-LD) do artigo: NewsArticle + FAQPage quando houver
// FAQ. E o que o Google e as IAs leem para entender e citar o post.
function buildJsonLd(post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>) {
  const category = post.category as Category | undefined
  const author = post.author as Author | undefined
  const tags = (post.tags ?? []).filter((t): t is Tag => typeof t === 'object')
  const hero = mediaUrl(post.ogImage) || mediaUrl(post.heroImage)
  const url = `${SITE_URL}/posts/${post.slug}`

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'NewsArticle',
      '@id': `${url}#article`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      headline: post.title,
      description: post.seo?.metaDescription || post.excerpt,
      image: hero ? [hero] : undefined,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      inLanguage: 'pt-BR',
      articleSection: category?.name,
      keywords: tags.length ? tags.map((t) => t.name).join(', ') : undefined,
      author: {
        '@type': 'Person',
        name: author?.name ?? 'Redação Dorama Universe',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Dorama Universe',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
      },
      ...(post.sourceLinks?.length
        ? { citation: post.sourceLinks.map((s) => s.url) }
        : {}),
    },
  ]

  if (post.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: post.faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const category = post.category as Category | undefined
  const [{ docs: comments, totalDocs }, { docs: related }] = await Promise.all([
    getComments(post.id),
    category ? getRelated(category.id, post.id) : Promise.resolve({ docs: [] as never[] }),
  ])

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(post)) }}
      />
      <ArticleView post={post} comments={comments} totalDocs={totalDocs} related={related} />

      <footer className="site-footer">
        <div className="container">
          <p>Dorama Universe — Doramas &amp; K-Pop · O universo Hallyu em um só lugar.</p>
        </div>
      </footer>
    </>
  )
}
