import React from 'react'
import Script from 'next/script'
import './styles.css'

export const metadata = {
  title: 'Dorama Universe — Doramas & K-Pop',
  description:
    'Notícias, resenhas e novidades sobre K-dramas, atores coreanos e K-Pop. O universo Hallyu em um só lugar.',
  icons: { icon: '/favicon.svg' },
}

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {adsenseClient && (
          <Script
            id="adsbygoogle-init"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          />
        )}
        {children}
      </body>
    </html>
  )
}
