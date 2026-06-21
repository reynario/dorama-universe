import Link from 'next/link'
import type { Post, Category, Author, Tag } from '@/payload-types'
import { formatDateLong, mediaUrl, mediaAlt } from '@/lib/utils'

type Props = {
  post: Post
  commentCount?: number
}

export default function PostCard({ post, commentCount = 0 }: Props) {
  const category = post.category as Category | undefined
  const author = post.author as Author | undefined
  const tags = (post.tags ?? []).filter((t): t is Tag => typeof t === 'object')
  const img = mediaUrl(post.heroImage)

  return (
    <article className="card">
      <Link href={`/posts/${post.slug}`} className="card__media">
        {img ? (
          <img src={img} alt={mediaAlt(post.heroImage, post.title)} loading="lazy" />
        ) : (
          <div className="card__media-fallback" />
        )}
        {category && (
          <span
            className="badge badge--category"
            style={category.color ? { backgroundColor: category.color } : undefined}
          >
            {category.name}
          </span>
        )}
        {typeof post.rating === 'number' && (
          <span className="badge badge--rating">★ {post.rating.toFixed(1)}</span>
        )}
      </Link>

      <div className="card__body">
        <div className="card__meta">
          <span>{author?.name ?? 'Redação'}</span>
          <span>•</span>
          <time>{formatDateLong(post.publishedAt)}</time>
        </div>

        <h3 className="card__title">
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>

        <p className="card__excerpt">{post.excerpt}</p>

        {tags.length > 0 && (
          <div className="taglist">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag.id} className="tag">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="card__footer">
          <span className="stat">❤️ {post.likes ?? 0}</span>
          <span className="stat">💬 {commentCount}</span>
        </div>
      </div>
    </article>
  )
}
