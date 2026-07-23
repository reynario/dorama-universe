import Link from 'next/link'
import type { Author, Category, Comment, Post, Tag } from '@/lib/types'
import CommentForm from '@/components/CommentForm'
import AdSlot from '@/components/AdSlot'
import LikeButton from '@/components/LikeButton'
import PostCard from '@/components/PostCard'
import { fixContentImages, formatDateLong, mediaUrl, mediaAlt } from '@/lib/utils'

// Corpo completo da pagina de artigo. Compartilhado entre a pagina publica
// (/posts/[slug]) e a pre-visualizacao de rascunho (/preview/[id]), para que
// o preview fique identico ao post publicado.
type Props = {
  post: Post
  comments: Comment[]
  totalDocs: number
  related: Post[]
}

export default function ArticleView({ post, comments, totalDocs, related }: Props) {
  const category = post.category as Category | undefined
  const author = post.author as Author | undefined
  const tags = (post.tags ?? []).filter((t): t is Tag => typeof t === 'object')
  const hero = mediaUrl(post.heroImage)
  const faq = post.faq ?? []
  const sources = post.sourceLinks ?? []

  return (
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
  )
}
