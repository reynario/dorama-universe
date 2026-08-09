import Link from 'next/link'

/**
 * Paginacao numerada.
 *
 * Antes so havia "anterior / proxima". Com ~48 paginas de arquivo, um post da
 * ultima pagina ficava a 48 cliques da home: o Googlebot nao desce tao fundo em
 * cadeias de paginacao, e a maior parte do acervo virava pagina orfa, so
 * alcancavel pelo sitemap. Alem da janela ao redor da pagina atual, incluimos
 * primeira, ultima e marcos em 1/4, 1/2 e 3/4 do arquivo — assim qualquer
 * pagina fica a poucos cliques sem imprimir dezenas de links.
 */
export default function Pagination({
  current,
  total,
  href,
}: {
  current: number
  total: number
  href: (page: number) => string
}) {
  if (total <= 1) return null

  return (
    <nav className="pagination" aria-label="Paginação">
      {current > 1 && (
        <Link href={href(current - 1)} className="page-btn" rel="prev">
          ← Anterior
        </Link>
      )}

      <span className="page-nums">
        {pageWindow(current, total).map((page, i) =>
          page === null ? (
            <span key={`gap-${i}`} className="page-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <Link
              key={page}
              href={href(page)}
              className={`page-num ${page === current ? 'page-num--active' : ''}`}
              aria-label={`Página ${page}`}
              aria-current={page === current ? 'page' : undefined}
            >
              {page}
            </Link>
          ),
        )}
      </span>

      {current < total && (
        <Link href={href(current + 1)} className="page-btn" rel="next">
          Próxima →
        </Link>
      )}
    </nav>
  )
}

// Numeros a exibir; null vira reticencias entre trechos nao contiguos.
function pageWindow(current: number, total: number): (number | null)[] {
  const wanted = new Set<number>([1, total])
  for (let p = current - 2; p <= current + 2; p++) {
    if (p > 1 && p < total) wanted.add(p)
  }
  for (const marco of [0.25, 0.5, 0.75]) {
    const p = Math.round(total * marco)
    if (p > 1 && p < total) wanted.add(p)
  }

  const sorted = [...wanted].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}
