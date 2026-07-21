import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getComments, getPostBySlug, getRelated } from '@/lib/api'
import type { Author, Category, Tag } from '@/lib/types'
import Header from '@/components/Header'
import CommentForm from '@/components/CommentForm'
import AdSlot from '@/components/AdSlot'
import LikeButton from '@/components/LikeButton'
import PostCard from '@/components/PostCard'
import { fixContentImages, formatDateLong, mediaUrl, mediaAlt } from '@/lib/utils'

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
  const author = post.author as Author | undefined
  const tags = (post.tags ?? []).filter((t): t is Tag => typeof t === 'object')
  const hero = mediaUrl(post.heroImage)
  const [{ docs: comments, totalDocs }, { docs: related }] = await Promise.all([
    getComments(post.id),
    category ? getRelated(category.id, post.id) : Promise.resolve({ docs: [] as never[] }),
  ])

  const faq = post.faq ?? []
  const sources = post.sourceLinks ?? []

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(post)) }}
      />
      <article className="article">
        <Link href="/" className="article__back">
          ← Voltar
        </Link>

        {category && (
          <div className="article__category">
            <span
              className="badge badge--category"
              style={category.color ? { backgroundColor: category.color } : undefined}
            >
              {category.name}
            </span>
          </div>
        )}

        <h1 className="article__title">{post.title}</h1>

        <div className="article__meta">
          <span>
            Por <strong>{author?.name ?? 'Redação'}</strong>
          </span>
          <time>{formatDateLong(post.publishedAt)}</time>
          {typeof post.rating === 'number' && <span>★ {post.rating.toFixed(1)}</span>}
        </div>

        {hero && (
          <img className="article__hero" src={hero} alt={mediaAlt(post.heroImage, post.title)} />
        )}

        {post.excerpt && <p className="article__excerpt">{post.excerpt}</p>}

        {post.contentHtml && (
          <div
            className="article__body"
            dangerouslySetInnerHTML={{ __html: fixContentImages(post.contentHtml) }}
          />
        )}

        {faq.length > 0 && (
          <section className="faq">
            <h2 className="section__title">Perguntas frequentes</h2>
            {faq.map((f, i) => (
              <details key={f.id ?? i} className="faq__item">
                <summary className="faq__question">{f.question}</summary>
                <p className="faq__answer">{f.answer}</p>
              </details>
            ))}
          </section>
        )}

        {sources.length > 0 && (
          <section className="sources">
            <h2 className="sources__title">Fontes</h2>
            <ul className="sources__list">
              {sources.map((s, i) => (
                <li key={s.id ?? i}>
                  <a href={s.url} target="_blank" rel="nofollow noopener noreferrer">
                    {s.title || new URL(s.url).hostname.replace(/^www\./, '')}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tags.length > 0 && (
          <div className="taglist">
            {tags.map((tag) => (
              <span key={tag.id} className="tag">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="article__stats">
          <LikeButton postId={post.id} initialLikes={post.likes ?? 0} />
          <span className="stat">💬 {totalDocs} comentários</span>
        </div>

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />

        {related.length > 0 && (
          <section className="related">
            <h2 className="section__title">Leia também</h2>
            <div className="grid">
              {related.map((r) => (
                <PostCard key={r.id} post={r} />
              ))}
            </div>
          </section>
        )}

        <section className="comments">
          <h3>Comentários ({totalDocs})</h3>
          {comments.length === 0 && <p className="stat">Seja o primeiro a comentar.</p>}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="comment__head">
                <span className="comment__author">{c.authorName}</span>
                <span className="comment__date">{formatDateLong(c.createdAt)}</span>
              </div>
              <p>{c.content}</p>
            </div>
          ))}
          <CommentForm postId={post.id} />
        </section>
      </article>

      <footer className="site-footer">
        <div className="container">
          <p>Dorama Universe — Doramas &amp; K-Pop · O universo Hallyu em um só lugar.</p>
        </div>
      </footer>
    </>
  )
}
