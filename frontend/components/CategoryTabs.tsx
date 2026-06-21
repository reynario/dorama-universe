import Link from 'next/link'
import type { Category } from '@/lib/types'

export default function CategoryTabs({
  categories,
  active,
}: {
  categories: Category[]
  active?: string
}) {
  return (
    <nav className="cat-tabs" aria-label="Categorias">
      <div className="container cat-tabs__inner">
        <Link href="/" className={`cat-tab ${!active ? 'cat-tab--active' : ''}`}>
          Todos
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/?categoria=${cat.slug}`}
            className={`cat-tab ${active === cat.slug ? 'cat-tab--active' : ''}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
