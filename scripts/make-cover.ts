import 'dotenv/config'
import { writeFileSync } from 'fs'
import { generateCover } from './lib/cover'

/**
 * Gera uma capa avulsa para teste/uso manual (sem tocar no Payload).
 *
 * Uso (PowerShell):
 *   pnpm tsx scripts/make-cover.ts --title "Lovely Runner ganha 2a temporada" --query "Lovely Runner" --type tv --category "K-Drama" --out capa.jpg
 *
 * Flags:
 *   --title     (obrigatorio) titulo estampado na capa
 *   --query     termo de busca no TMDB (dorama, filme ou pessoa)
 *   --type      tv | movie | person | multi (padrao: multi)
 *   --category  texto do selo. Ex.: "K-Pop"
 *   --out       arquivo de saida (padrao: cover.jpg)
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const title = arg('title')
if (!title) {
  console.error('Uso: pnpm tsx scripts/make-cover.ts --title "..." [--query "..."] [--type tv] [--category "..."] [--out capa.jpg]')
  process.exit(1)
}

const result = await generateCover({
  title,
  query: arg('query'),
  type: arg('type') as any,
  category: arg('category'),
})

const out = arg('out') || 'cover.jpg'
writeFileSync(out, result.buffer)
console.log(
  `Capa gerada: ${out} (${(result.buffer.length / 1024).toFixed(0)} KB) | TMDB: ${result.tmdbUsed ? `sim (${result.tmdbLabel})` : 'nao (template brand)'}`,
)
