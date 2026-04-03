import Link from 'next/link'
import Hero from '@/components/store/Hero'
import ProductCard from '@/components/store/ProductCard'
import { supabaseAdmin } from '@/lib/supabase'
import type { Product } from '@/types'
import { ArrowRight, Zap, Shield, RotateCcw, Headphones } from 'lucide-react'

const categories = [
  {
    name: 'Electronics',
    emoji: '📱',
    href: '/products?category=Electronics',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-100',
    textColor: 'text-blue-700',
  },
  {
    name: 'Home & Garden',
    emoji: '🏠',
    href: '/products?category=Home+%26+Garden',
    color: 'bg-green-50 hover:bg-green-100 border-green-100',
    textColor: 'text-green-700',
  },
  {
    name: 'Beauty',
    emoji: '💄',
    href: '/products?category=Beauty',
    color: 'bg-pink-50 hover:bg-pink-100 border-pink-100',
    textColor: 'text-pink-700',
  },
  {
    name: 'Sports',
    emoji: '⚡',
    href: '/products?category=Sports',
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-100',
    textColor: 'text-orange-700',
  },
  {
    name: 'Pet Supplies',
    emoji: '🐾',
    href: '/products?category=Pet+Supplies',
    color: 'bg-amber-50 hover:bg-amber-100 border-amber-100',
    textColor: 'text-amber-700',
  },
  {
    name: 'Kitchen',
    emoji: '🍳',
    href: '/products?category=Kitchen',
    color: 'bg-red-50 hover:bg-red-100 border-red-100',
    textColor: 'text-red-700',
  },
]

const features = [
  {
    icon: Zap,
    title: 'Fast SA Delivery',
    desc: 'Nationwide delivery across South Africa',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    desc: 'PayFast & Yoco — trusted SA payment gateways',
  },
  {
    icon: RotateCcw,
    title: '30-Day Returns',
    desc: 'Hassle-free returns on all orders',
  },
  {
    icon: Headphones,
    title: 'SA Support',
    desc: 'Local customer support team',
  },
]

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_published', true)
      .order('orders_count', { ascending: false })
      .limit(8)
    return (data as Product[]) || []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()

  return (
    <>
      <Hero />

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">
                Shop by Category
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Find exactly what you&apos;re looking for
              </p>
            </div>
            <Link
              href="/products"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              All products
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(cat => (
              <Link
                key={cat.name}
                href={cat.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${cat.color}`}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span
                  className={`text-sm font-semibold text-center ${cat.textColor}`}
                >
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">
                Popular Products
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Top picks for South African shoppers
              </p>
            </div>
            <Link
              href="/products"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">
                No products yet — check back soon!
              </p>
              <p className="text-sm mt-2">
                Our team is sourcing the best products for you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map(feature => (
              <div key={feature.title} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-xl flex items-center justify-center">
                  <feature.icon size={24} className="text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-amber-500">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A]">
            Ready to Shop?
          </h2>
          <p className="text-amber-900 mt-3 text-lg">
            Thousands of products available for delivery across South Africa.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 mt-6 bg-[#0F172A] hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl transition-colors"
          >
            Shop All Products
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  )
}
