import Link from 'next/link'
import type { Category } from '@/payload-types'

type Props = {
  categories: Category[]
  active?: string
}

export default function CategoryTabs({ categories, active }: Props) {
  return (
    <nav className="cat-tabs" aria-label="Categorias">
      <div className="container cat-tabs__inner">
        <Link
          href="/"
          className={`cat-tab ${!active ? 'cat-tab--active' : ''}`}
        >
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
