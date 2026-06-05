import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata = {
  title: 'Jotey',
  description: 'Joinery repair quoting for NZ tradespeople',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#22A67A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22A67A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jotey" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
