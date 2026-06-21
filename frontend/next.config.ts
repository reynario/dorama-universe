import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Usamos <img> simples (sem o otimizador do Next) para rodar bem no edge.
  images: { unoptimized: true },
}

export default nextConfig
