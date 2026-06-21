'use client'

import { useEffect } from 'react'

// Bloco de anuncio reutilizavel (Google AdSense).
// So renderiza de fato quando NEXT_PUBLIC_ADSENSE_CLIENT estiver configurado
// no .env. Antes disso mostra um placeholder discreto, para nao quebrar o layout.
type Props = {
  /** ID do bloco de anuncio criado no painel do AdSense (data-ad-slot). */
  slot?: string
  /** Formato. "auto" se adapta ao espaco; tambem aceita "horizontal" etc. */
  format?: string
  /** Rotulo do placeholder enquanto o AdSense nao esta ativo. */
  label?: string
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export default function AdSlot({ slot, format = 'auto', label = 'Espaço publicitário' }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (!client || !slot) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // ignora erros do AdSense (ex.: bloqueador de anuncios)
    }
  }, [client, slot])

  // Sem bloco manual configurado:
  // - em producao deixamos os "anuncios automaticos" (por site) cuidarem da pagina,
  //   entao nao renderizamos nada aqui;
  // - em desenvolvimento mostramos um placeholder so para visualizar o espaco.
  if (!client || !slot) {
    if (process.env.NODE_ENV !== 'development') return null
    return (
      <div className="ad-slot ad-slot--placeholder" aria-hidden="true">
        <span>{label}</span>
      </div>
    )
  }

  return (
    <div className="ad-slot">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
