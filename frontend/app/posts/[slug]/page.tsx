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

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Post não encontrado — Dorama Universe' }
  return { title: `${post.title} — Dorama Universe`, description: post.excerpt }
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

  return (
    <>
      <Header />
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
