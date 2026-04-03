'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import { formatZAR } from '@/lib/utils'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQty, total, itemCount } = useCartStore()
  const cartTotal = total()
  const cartItemCount = itemCount()
  const shipping = cartTotal > 1000 ? 0 : 99

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#0F172A]">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-[#F59E0B]" size={20} />
                <h2 className="font-bold text-white text-lg">
                  Your Cart
                  {cartItemCount > 0 && (
                    <span className="ml-2 text-[#F59E0B] text-sm font-normal">
                      ({cartItemCount} {cartItemCount === 1 ? 'item' : 'items'})
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag
                    size={48}
                    className="text-gray-200 mb-4"
                  />
                  <p className="text-gray-500 font-medium">
                    Your cart is empty
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Add some products to get started
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 bg-[#0F172A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#1E293B] transition-colors"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {items.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-3 pb-4 border-b border-gray-50 last:border-0"
                      >
                        <div className="relative w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={onClose}
                          >
                            <p className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-amber-600 transition-colors">
                              {item.name}
                            </p>
                          </Link>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            {formatZAR(item.price)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() =>
                                  updateQty(item.id, item.qty - 1)
                                }
                                className="px-2 py-1 hover:bg-gray-50 transition-colors text-gray-600"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium min-w-[32px] text-center">
                                {item.qty}
                              </span>
                              <button
                                onClick={() =>
                                  updateQty(item.id, item.qty + 1)
                                }
                                className="px-2 py-1 hover:bg-gray-50 transition-colors text-gray-600"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors ml-auto"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatZAR(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                      {shipping === 0 ? 'FREE' : formatZAR(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[#0F172A] text-base pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatZAR(cartTotal + shipping)}</span>
                  </div>
                </div>

                {cartTotal < 1000 && (
                  <p className="text-xs text-amber-600 mb-3 text-center">
                    Add {formatZAR(1000 - cartTotal)} more for free shipping!
                  </p>
                )}

                <Link href="/checkout" onClick={onClose}>
                  <button className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95">
                    Checkout
                    <ArrowRight size={18} />
                  </button>
                </Link>

                <Link href="/cart" onClick={onClose}>
                  <button className="w-full mt-2 text-sm text-gray-500 hover:text-[#0F172A] py-2 transition-colors">
                    View Full Cart
                  </button>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
