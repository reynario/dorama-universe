import Link from 'next/link'
import type { Author, Category, Post, Tag } from '@/lib/types'
import { formatDateLong, mediaUrl, mediaAlt } from '@/lib/utils'

export default function FeaturedPost({
  post,
  commentCount = 0,
}: {
  post: Post
  commentCount?: number
}) {
  const category = post.category as Category | undefined
  const author = post.author as Author | undefined
  const tags = (post.tags ?? []).filter((t): t is Tag => typeof t === 'object')
  const img = mediaUrl(post.heroImage)

  return (
    <article className="featured">
      <Link href={`/posts/${post.slug}`} className="featured__media">
        {img ? (
          <img src={img} alt={mediaAlt(post.heroImage, post.title)} />
        ) : (
          <div className="card__media-fallback" />
        )}
        <div className="featured__badges">
          <span className="badge badge--hot">MAIS CURTIDO</span>
          {category && (
            <span
              className="badge badge--category"
              style={category.color ? { backgroundColor: category.color } : undefined}
            >
              {category.name}
            </span>
          )}
        </div>
      </Link>

      <div className="featured__body">
        <div className="featured__kicker">
          ARTIGO PRINCIPAL <span>•</span> {formatDateLong(post.publishedAt)}
        </div>

        <h2 className="featured__title">
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h2>

        <p className="featured__excerpt">{post.excerpt}</p>

        {tags.length > 0 && (
          <div className="taglist">
            {tags.slice(0, 6).map((tag) => (
              <span key={tag.id} className="tag">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="featured__footer">
          <span className="featured__author">{author?.name ?? 'Redação'}</span>
          <div className="featured__stats">
            <span className="stat">❤️ {post.likes ?? 0}</span>
            <span className="stat">💬 {commentCount}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
