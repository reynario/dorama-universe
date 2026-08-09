import { redirectLegacyPost } from '@/lib/legacy'

// Traducoes do WordPress antigo: /es/reparto-de-only-for-love/
// Elas foram importadas como posts normais, entao caem no mesmo /posts/<slug>.
export const revalidate = 3600

// Mesma razao do /posts/[slug]: registra a rota para ISR sob demanda, para o
// 308 de cada URL antiga ficar cacheado em vez de consultar o Payload sempre.
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export default async function LegacyEsPostUrl({ params }: Props) {
  const { slug } = await params
  await redirectLegacyPost(slug)
}
