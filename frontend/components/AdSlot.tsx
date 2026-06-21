'use client'

import { useEffect } from 'react'

type Props = { slot?: string; format?: string; label?: string }

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export default function AdSlot({ slot, format = 'auto', label = 'Anúncio' }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (!client || !slot) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* bloqueador de anuncios */
    }
  }, [client, slot])

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
