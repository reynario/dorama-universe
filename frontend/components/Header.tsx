import Link from 'next/link'

const ADMIN_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/admin`

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand" aria-label="Dorama Universe">
          <img className="brand__logo" src="/logo.svg" alt="Dorama Universe" />
        </Link>

        <form className="searchbar" action="/" method="get" role="search">
          <input
            type="search"
            name="q"
            placeholder="Pesquisar por doramas, atores, episódios, k-pop..."
            aria-label="Pesquisar"
          />
          <button type="submit" aria-label="Buscar">
            🔍
          </button>
        </form>

        <a className="btn btn--admin" href={ADMIN_URL}>
          Entrar ADM
        </a>
      </div>
    </header>
  )
}
