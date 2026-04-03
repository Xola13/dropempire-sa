'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Search, Menu, X, Package } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import { motion, AnimatePresence } from 'framer-motion'
import AccountMenu from '@/components/store/AccountMenu'

const categories = [
  { name: 'Electronics', href: '/products?category=Electronics' },
  { name: 'Home & Garden', href: '/products?category=Home+%26+Garden' },
  { name: 'Beauty', href: '/products?category=Beauty' },
  { name: 'Sports', href: '/products?category=Sports' },
  { name: 'Pet Supplies', href: '/products?category=Pet+Supplies' },
  { name: 'Kitchen', href: '/products?category=Kitchen' },
]

interface NavbarProps {
  onCartOpen: () => void
}

export default function Navbar({ onCartOpen }: NavbarProps) {
  const itemCount = useCartStore(s => s.itemCount())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white shadow-md'
          : 'bg-white border-b border-gray-100'
      }`}
    >
      {/* Top announcement bar */}
      <div className="bg-[#0F172A] text-[#F59E0B] text-xs text-center py-1.5 px-4">
        Free shipping on orders over R1,000 · Fast SA delivery · Secure payments
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center group-hover:bg-[#F59E0B] transition-colors">
              <Package className="w-4 h-4 text-[#F59E0B] group-hover:text-[#0F172A] transition-colors" />
            </div>
            <span className="font-bold text-[#0F172A] text-xl tracking-tight">
              Drop<span className="text-[#F59E0B]">Empire</span>{' '}
              <span className="text-sm font-normal text-gray-500">SA</span>
            </span>
          </Link>

          {/* Desktop Category Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {categories.map(cat => (
              <Link
                key={cat.name}
                href={cat.href}
                className="text-sm text-gray-600 hover:text-[#0F172A] font-medium transition-colors hover:underline underline-offset-4 decoration-[#F59E0B]"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <AnimatePresence>
              {searchOpen ? (
                <motion.form
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  onSubmit={handleSearch}
                  className="overflow-hidden"
                >
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#F59E0B]"
                  />
                </motion.form>
              ) : null}
            </AnimatePresence>

            <button
              onClick={() => setSearchOpen(v => !v)}
              className="p-2 text-gray-500 hover:text-[#0F172A] hover:bg-gray-100 rounded-lg transition-colors"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {/* Account Menu */}
            <AccountMenu />

            {/* Cart */}
            <button
              onClick={onCartOpen}
              className="relative p-2 text-gray-500 hover:text-[#0F172A] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-[#F59E0B] text-[#0F172A] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 text-gray-500 hover:text-[#0F172A] hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <form onSubmit={handleSearch} className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]"
                />
              </form>
              {categories.map(cat => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-gray-700 hover:text-[#0F172A] font-medium py-1.5"
                >
                  {cat.name}
                </Link>
              ))}
              <hr className="border-gray-100" />
              <Link
                href="/track"
                onClick={() => setMobileOpen(false)}
                className="block text-gray-700 hover:text-[#0F172A] py-1.5"
              >
                Track Order
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
