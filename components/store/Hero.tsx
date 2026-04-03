'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Truck, RotateCcw, CreditCard } from 'lucide-react'

const trustBadges = [
  { icon: CreditCard, label: 'PayFast Secure' },
  { icon: Truck, label: 'SA Delivery' },
  { icon: RotateCcw, label: '30-day Returns' },
  { icon: Shield, label: '100% Secure' },
]

export default function Hero() {
  return (
    <section className="relative bg-[#0F172A] overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Gold accent circles */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#F59E0B] rounded-full opacity-10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#F59E0B] rounded-full opacity-5 blur-2xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
              South Africa&apos;s Premier Online Store
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight"
          >
            Shop Smarter.{' '}
            <span className="text-[#F59E0B]">Delivered</span>{' '}
            to Your Door.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-gray-300 leading-relaxed max-w-xl"
          >
            Thousands of quality products delivered across South Africa.
            Secure SA payments, competitive prices, and reliable delivery
            you can count on.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:shadow-[0_4px_14px_rgba(245,158,11,0.5)] active:scale-95"
            >
              Shop Now
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/track"
              className="inline-flex items-center gap-2 border border-white/20 hover:border-[#F59E0B]/50 text-white hover:text-[#F59E0B] font-medium px-8 py-4 rounded-xl transition-all duration-200"
            >
              Track Order
            </Link>
          </motion.div>
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {trustBadges.map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            >
              <div className="w-9 h-9 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <badge.icon className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <span className="text-white text-sm font-medium">
                {badge.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
