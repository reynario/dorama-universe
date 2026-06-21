import fs from 'fs'
import path from 'path'

/**
 * Limpeza das imagens exportadas do WordPress.
 *
 * Regras:
 *  1) Apaga TODAS as versoes redimensionadas (sufixo -LARGURAxALTURA antes da
 *     extensao), em qualquer formato (jpg/png/webp/avif).
 *  2) Apaga o arquivo raster (jpg/jpeg/png/gif) SOMENTE quando existe um WebP
 *     equivalente (forma "substituida": 0.webp, ou "anexada": 0.png.webp).
 *  3) NUNCA apaga WebP, nem imagem que seja a unica copia (ex.: so existe .webp).
 *  4) Nao toca em arquivos que nao sejam imagem (.log, .json, .htaccess, etc).
 *  5) Sufixos -1, -2 (ex.: 0-1.png) sao imagens distintas e sao preservados.
 *
 * Escopo: subpastas 2023, 2024, 2025 (recursivo).
 *
 * Uso:
 *   node scripts/clean-images.mjs           -> SIMULACAO (nao apaga nada)
 *   DELETE=1 node scripts/clean-images.mjs  -> apaga de verdade
 */

const ROOT = process.env.UPLOADS || 'C:/Users/Adm/Pictures/uploads'
const YEARS = ['2023', '2024', '2025']
const DELETE = process.env.DELETE === '1'

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.gif'])
const IMAGE = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'])
const resizedRe = /-\d+x\d+(?:\.[a-z0-9]+)+$/i

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name)
    if (e.isDirectory()) walk(fp, acc)
    else acc.push(fp)
  }
  return acc
}

const files = []
for (const y of YEARS) {
  const p = path.join(ROOT, y)
  if (fs.existsSync(p)) walk(p, files)
}

// Indice de nomes (minusculos) por diretorio, para achar o WebP equivalente.
const byDir = new Map()
for (const f of files) {
  const d = path.dirname(f)
  if (!byDir.has(d)) byDir.set(d, new Set())
  byDir.get(d).add(path.basename(f).toLowerCase())
}

function hasWebpTwin(filePath) {
  const d = path.dirname(filePath)
  const set = byDir.get(d)
  const b = path.basename(filePath).toLowerCase()
  const ext = path.extname(b)
  const stem = b.slice(0, -ext.length)
  return set.has(b + '.webp') || set.has(stem + '.webp')
}

const delResized = []
const delRaster = []
let keepCount = 0
let keepWebpOnly = 0
let bytesFreed = 0

function size(f) {
  try {
    return fs.statSync(f).size
  } catch {
    return 0
  }
}

for (const f of files) {
  const ext = path.extname(f).toLowerCase()
  if (!IMAGE.has(ext)) continue // ignora nao-imagens
  if (resizedRe.test(f)) {
    delResized.push(f)
    bytesFreed += size(f)
    continue
  }
  if (RASTER.has(ext) && hasWebpTwin(f)) {
    delRaster.push(f)
    bytesFreed += size(f)
    continue
  }
  keepCount++
  if (ext === '.webp') keepWebpOnly++
}

const mb = (n) => (n / 1024 / 1024).toFixed(1)

console.log(`Escopo: ${YEARS.join(', ')} em ${ROOT}`)
console.log(`Imagens analisadas: ${delResized.length + delRaster.length + keepCount}`)
console.log(`A APAGAR (redimensionadas):        ${delResized.length}`)
console.log(`A APAGAR (raster com WebP gemeo):  ${delRaster.length}`)
console.log(`A MANTER:                          ${keepCount}  (sendo ${keepWebpOnly} webp)`)
console.log(`Espaco liberado estimado:          ${mb(bytesFreed)} MB`)

// Gera relatorios para auditoria
const reportDir = path.dirname(new URL(import.meta.url).pathname)
const outDir = path.resolve(process.cwd(), 'import')
fs.writeFileSync(path.join(outDir, 'cleanup-a-apagar.txt'), [...delResized, ...delRaster].join('\n'), 'utf8')
console.log(`\nLista completa do que seria apagado: import/cleanup-a-apagar.txt`)

console.log('\n--- amostras: raster a apagar (tem webp) ---')
delRaster.slice(0, 5).forEach((f) => console.log('  ' + path.basename(f)))
console.log('--- amostras: mantidos ---')
files
  .filter((f) => {
    const ext = path.extname(f).toLowerCase()
    return IMAGE.has(ext) && !resizedRe.test(f) && !(RASTER.has(ext) && hasWebpTwin(f))
  })
  .slice(0, 8)
  .forEach((f) => console.log('  ' + path.basename(f)))

if (DELETE) {
  console.log('\nApagando...')
  let done = 0
  for (const f of [...delResized, ...delRaster]) {
    try {
      fs.unlinkSync(f)
      done++
    } catch (err) {
      console.warn('  ! falha: ' + f + ' (' + err.message + ')')
    }
  }
  console.log(`Apagados: ${done}`)
} else {
  console.log('\n[SIMULACAO] Nada foi apagado. Rode com DELETE=1 para apagar de verdade.')
}
