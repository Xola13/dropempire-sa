'use client'

import { useCartStore } from '@/lib/store/cart'
import { formatZAR } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Cart() {
  const { items, removeItem, updateQty, total } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={32} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A] mb-3">
          Your cart is empty
        </h2>
        <p className="text-gray-500 mb-8">
          Discover great deals and add items to get started
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-[#F59E0B] text-[#0F172A] font-bold px-8 py-3.5 rounded-xl hover:bg-[#D97706] transition-colors"
        >
          Browse Products
          <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  const shipping = total() >= 1000 ? 0 : 99
  const grandTotal = total() + shipping

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl font-bold text-[#0F172A] mb-8">
        Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4"
              >
                {/* Image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-semibold text-[#0F172A] hover:text-[#F59E0B] transition-colors line-clamp-2 text-sm"
                  >
                    {item.name}
                  </Link>
                  <p className="text-lg font-bold text-[#0F172A] mt-1">
                    {formatZAR(item.price * item.qty)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatZAR(item.price)} each
                  </p>
                </div>

                {/* Qty + Remove */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        updateQty(item.id, Math.max(1, item.qty - 1))
                      }
                      className="px-2 py-1 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold min-w-10 text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="px-2 py-1 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <h2 className="font-bold text-lg text-[#0F172A] mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatZAR(total())}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-emerald-600 font-medium">FREE</span>
                  ) : (
                    formatZAR(shipping)
                  )}
                </span>
              </div>
              {total() < 1000 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  Add {formatZAR(1000 - total())} more for free shipping
                </p>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-[#0F172A] text-lg">
                <span>Total</span>
                <span>{formatZAR(grandTotal)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 w-full flex items-center justify-center gap-2 bg-[#F59E0B] text-[#0F172A] font-bold py-3.5 rounded-xl hover:bg-[#D97706] transition-colors"
            >
              Proceed to Checkout
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/products"
              className="mt-3 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-[#0F172A] text-sm font-medium transition-colors py-2"
            >
              Continue Shopping
            </Link>

            {/* Trust badges */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '🔒', label: 'Secure Payment' },
                  { icon: '🚚', label: 'Fast Delivery' },
                  { icon: '✅', label: 'Quality Assured' },
                  { icon: '🔄', label: 'Easy Returns' },
                ].map(badge => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-1.5 text-xs text-gray-500"
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
