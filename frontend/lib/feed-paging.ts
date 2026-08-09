/**
 * Le o numero de pagina de um segmento de URL (/pagina/<n>).
 *
 * Rejeita qualquer coisa que nao seja um inteiro positivo em forma canonica —
 * "02", "3.0", "4abc" e negativos viram 404 em vez de renderizarem a mesma
 * listagem em varias URLs diferentes.
 */
export function parsePageParam(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) ? n : null
}
