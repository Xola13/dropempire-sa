'use client'

import { useCartStore } from '@/lib/store/cart'
import Image from 'next/image'
import Link from 'next/link'
import { formatZAR } from '@/lib/utils'
import { Minus, Plus, X, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CartPage() {
  const { items, removeItem, updateQty, total, itemCount } = useCartStore()
  const cartTotal = total()
  const cartCount = itemCount()
  const shipping = cartTotal > 1000 ? 0 : 99

  if (cartCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag
          size={64}
          className="mx-auto text-gray-200 mb-6"
        />
        <h1 className="text-2xl font-bold text-[#0F172A]">
          Your cart is empty
        </h1>
        <p className="text-gray-500 mt-2">
          Looks like you haven&apos;t added anything yet.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 mt-8 bg-[#F59E0B] hover:bg-amber-600 text-[#0F172A] font-bold px-8 py-4 rounded-xl transition-colors"
        >
          Start Shopping
          <ArrowRight size={18} />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-[#0F172A] mb-8">
        Your Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4"
              >
                <Link href={`/products/${item.slug}`}>
                  <div className="relative w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/products/${item.slug}`}>
                      <h3 className="font-medium text-gray-800 text-sm line-clamp-2 hover:text-amber-600 transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        className="px-3 py-1.5 hover:bg-gray-50 transition-colors text-gray-600"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-4 py-1.5 text-sm font-semibold min-w-[40px] text-center border-x border-gray-200">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        className="px-3 py-1.5 hover:bg-gray-50 transition-colors text-gray-600"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0F172A]">
                        {formatZAR(item.price * item.qty)}
                      </p>
                      {item.qty > 1 && (
                        <p className="text-xs text-gray-400">
                          {formatZAR(item.price)} each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
            <h2 className="font-bold text-[#0F172A] text-lg mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>
                  Subtotal ({cartCount} item{cartCount !== 1 ? 's' : ''})
                </span>
                <span>{formatZAR(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {shipping === 0 ? 'FREE' : formatZAR(shipping)}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between font-bold text-[#0F172A] text-base">
                <span>Total</span>
                <span>{formatZAR(cartTotal + shipping)}</span>
              </div>
            </div>

            {cartTotal < 1000 && (
              <div className="mt-4 bg-amber-50 rounded-lg p-3 flex items-center gap-2 text-sm">
                <Truck size={16} className="text-amber-600 flex-shrink-0" />
                <span className="text-amber-700">
                  Add{' '}
                  <span className="font-bold">
                    {formatZAR(1000 - cartTotal)}
                  </span>{' '}
                  more for free delivery
                </span>
              </div>
            )}

            <Link href="/checkout">
              <button className="w-full mt-6 bg-[#F59E0B] hover:bg-amber-600 text-[#0F172A] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95">
                Proceed to Checkout
                <ArrowRight size={18} />
              </button>
            </Link>

            <Link href="/products">
              <button className="w-full mt-3 text-sm text-gray-500 hover:text-[#0F172A] py-2 transition-colors">
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
