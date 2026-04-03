'use client'

import { useState } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/store/Navbar'
import CartDrawer from '@/components/store/CartDrawer'
import Footer from '@/components/store/Footer'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <html lang="en-ZA">
      <head>
        <title>DropEmpire SA — Shop Smarter, Delivered to Your Door</title>
        <meta
          name="description"
          content="South Africa's premier online store. Quality products from trusted suppliers, delivered across SA. Secure PayFast payments."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        <Navbar onCartOpen={() => setCartOpen(true)} />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
        />
      </body>
    </html>
  )
}
