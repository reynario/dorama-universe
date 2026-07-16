// Tipos minimos espelhando as collections do Payload (apenas o que o site usa).

export type Media = {
  id: number
  url?: string | null
  filename?: string | null
  alt?: string | null
}

export type Category = {
  id: number
  name: string
  slug: string
  color?: string | null
}

export type Author = {
  id: number
  name: string
  role?: string | null
}

export type Tag = {
  id: number
  name: string
  slug: string
}

export type FaqItem = {
  id?: string
  question: string
  answer: string
}

export type SourceLink = {
  id?: string
  url: string
  title?: string | null
}

export type Post = {
  id: number
  title: string
  slug: string
  excerpt: string
  heroImage?: Media | number | null
  content?: unknown
  contentHtml?: string | null
  category?: Category | number | null
  author?: Author | number | null
  tags?: (Tag | number)[] | null
  rating?: number | null
  likes?: number | null
  featured?: boolean | null
  publishedAt: string
  updatedAt?: string
  seo?: {
    metaTitle?: string | null
    metaDescription?: string | null
  } | null
  faq?: FaqItem[] | null
  sourceLinks?: SourceLink[] | null
  _status?: 'draft' | 'published'
}

export type Comment = {
  id: number
  post: number | Post
  authorName: string
  content: string
  approved?: boolean
  createdAt: string
}

export type Paginated<T> = {
  docs: T[]
  totalDocs: number
  page?: number
  totalPages?: number
}
