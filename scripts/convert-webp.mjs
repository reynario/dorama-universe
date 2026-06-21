import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

/**
 * Converte para WebP todas as imagens que ainda nao sao WebP nas pastas
 * 2023/2024/2025 e apaga o original apos a conversao bem-sucedida.
 *
 * - GIFs sao convertidos preservando animacao.
 * - Se ja existir um .webp com o mesmo nome, o original e PULADO (nao sobrescreve).
 *
 * Uso:
 *   node scripts/convert-webp.mjs          -> converte e apaga originais
 *   KEEP=1 node scripts/convert-webp.mjs   -> converte e mantem os originais
 */

const ROOT = process.env.UPLOADS || 'C:/Users/Adm/Pictures/uploads'
const YEARS = ['2023', '2024', '2025']
const KEEP = process.env.KEEP === '1'
const CONCURRENCY = Number(process.env.CONCURRENCY || 6)
const QUALITY = Number(process.env.QUALITY || 82)

const SRC = new Set(['.jpg', '.jpeg', '.png', '.gif', '.avif'])

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name)
    if (e.isDirectory()) walk(fp, acc)
    else acc.push(fp)
  }
  return acc
}

const all = []
for (const y of YEARS) {
  const p = path.join(ROOT, y)
  if (fs.existsSync(p)) walk(p, all)
}
const targets = all.filter((f) => SRC.has(path.extname(f).toLowerCase()))

console.log(`Imagens a converter: ${targets.length} (qualidade ${QUALITY}, concorrencia ${CONCURRENCY})`)

let converted = 0
let skipped = 0
let failed = 0
let bytesBefore = 0
let bytesAfter = 0

async function convertOne(file) {
  const ext = path.extname(file).toLowerCase()
  const target = file.slice(0, -ext.length) + '.webp'
  if (fs.existsSync(target)) {
    skipped++
    return
  }
  try {
    const before = fs.statSync(file).size
    const isGif = ext === '.gif'
    await sharp(file, isGif ? { animated: true } : {})
      .webp({ quality: QUALITY, effort: 4 })
      .toFile(target)
    const after = fs.statSync(target).size
    bytesBefore += before
    bytesAfter += after
    if (!KEEP) fs.unlinkSync(file)
    converted++
    if (converted % 200 === 0) console.log(`... ${converted} convertidas`)
  } catch (err) {
    failed++
    console.warn(`  ! falha: ${path.basename(file)} (${err.message})`)
  }
}

// pool de concorrencia simples
let idx = 0
async function worker() {
  while (idx < targets.length) {
    const i = idx++
    await convertOne(targets[i])
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

const mb = (n) => (n / 1024 / 1024).toFixed(1)
console.log(`\nConcluido.`)
console.log(`Convertidas: ${converted} | Puladas (ja tinha webp): ${skipped} | Falhas: ${failed}`)
console.log(`Tamanho originais: ${mb(bytesBefore)} MB -> WebP: ${mb(bytesAfter)} MB`)
process.exit(0)
