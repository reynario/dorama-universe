import React from 'react'
import Script from 'next/script'
import { Sora } from 'next/font/google'
import './styles.css'

// Fonte de destaque (titulos). Baixada no build e servida localmente pelo Next.
const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})

export const metadata = {
  title: 'Dorama Universe — Doramas & K-Pop',
  description:
    'Notícias, resenhas e novidades sobre K-dramas, atores coreanos e K-Pop. O universo Hallyu em um só lugar.',
  icons: {
    icon: '/favicon.svg',
  },
}

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="pt-BR" className={sora.variable}>
      <body>
        {/* Google AdSense: so carrega quando o ID do publisher esta no .env */}
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
