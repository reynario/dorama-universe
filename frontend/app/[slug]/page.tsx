import { redirectLegacyPost } from '@/lib/legacy'

// URLs do WordPress antigo, que ficavam na raiz: /serie-coreana-chocolate/
// Ver lib/legacy.ts. Rotas concretas (/posts, /preview, /sitemap.xml) tem
// precedencia sobre este segmento dinamico e nao passam por aqui.
export const revalidate = 3600

// Mesma razao do /posts/[slug]: registra a rota para ISR sob demanda, para o
// 308 de cada URL antiga ficar cacheado em vez de consultar o Payload sempre.
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export default async function LegacyPostUrl({ params }: Props) {
  const { slug } = await params
  await redirectLegacyPost(slug)
}
