import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// Embute uma imagem raster (jpg/png) dentro de um wrapper SVG, preservando a arte.
// Uso: node scripts/raster-to-svg.mjs <entrada> <saida.svg>
const [, , input, output] = process.argv
if (!input || !output) {
  console.error('Uso: node scripts/raster-to-svg.mjs <entrada> <saida.svg>')
  process.exit(1)
}

const buf = fs.readFileSync(input)
const meta = await sharp(buf).metadata()
const ext = path.extname(input).toLowerCase()
const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
const b64 = buf.toString('base64')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}" viewBox="0 0 ${meta.width} ${meta.height}">
  <image href="data:${mime};base64,${b64}" width="${meta.width}" height="${meta.height}"/>
</svg>
`
fs.writeFileSync(output, svg)
console.log(`OK: ${output} (${meta.width}x${meta.height}, ${(buf.length / 1024).toFixed(0)} KB)`)
