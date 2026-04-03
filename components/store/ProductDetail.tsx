'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Truck,
  Shield,
  ChevronDown,
  ChevronUp,
  Star,
  Share2,
  Check,
} from 'lucide-react'
import { formatZAR, getDeliveryLabel } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart'
import type { Product } from '@/types'

interface ProductDetailProps {
  product: Product
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const addItem = useCartStore(s => s.addItem)
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',
        ]

  const discount = product.compare_at_price
    ? Math.round(
        ((product.compare_at_price - product.selling_price) /
          product.compare_at_price) *
          100
      )
    : 0

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.selling_price,
      image: images[0],
      slug: product.slug,
      qty,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const description = product.ai_description || product.description

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  unoptimized={images[selectedImage].includes('aliexpress') ||
                    images[selectedImage].includes('cjdropshipping')}
                />
              </motion.div>
            </AnimatePresence>

            {discount > 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                -{discount}% OFF
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === i
                      ? 'border-[#F59E0B]'
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Category & title */}
          <div>
            <p className="text-sm text-[#F59E0B] font-semibold uppercase tracking-wide">
              {product.category}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] mt-2 leading-tight">
              {product.name}
            </h1>

            {product.orders_count > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < 4
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200 fill-gray-200'
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {product.orders_count} sold
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[#0F172A]">
              {formatZAR(product.selling_price)}
            </span>
            {product.compare_at_price && (
              <span className="text-xl text-gray-400 line-through">
                {formatZAR(product.compare_at_price)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-sm font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                Save {formatZAR(product.compare_at_price! - product.selling_price)}
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-gray-600 leading-relaxed">{description}</p>
          )}

          {/* Bullet points */}
          {product.bullet_points && product.bullet_points.length > 0 && (
            <ul className="space-y-2">
              {product.bullet_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* Add to Cart */}
          {product.stock_status !== 'out_of_stock' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {/* Qty picker */}
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    -
                  </button>
                  <span className="px-4 py-3 font-semibold text-[#0F172A] min-w-12 text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    +
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    added
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]'
                  }`}
                >
                  {added ? (
                    <>
                      <Check size={18} />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={18} />
                      Add to Cart
                    </>
                  )}
                </motion.button>
              </div>

              {product.stock_status === 'low_stock' && (
                <p className="text-sm text-amber-600 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Only a few left in stock
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-center">
              <p className="font-semibold text-gray-500">Out of Stock</p>
              <p className="text-sm text-gray-400 mt-1">
                Check back soon for restocking
              </p>
            </div>
          )}

          {/* Delivery & Trust */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-3.5">
              <Truck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800 text-sm">Delivery</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {getDeliveryLabel(product.supplier)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-emerald-50 rounded-xl p-3.5">
              <Shield size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-800 text-sm">
                  Buyer Protection
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Secure PayFast payment
                </p>
              </div>
            </div>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Share2 size={14} />
            Share this product
          </button>
        </div>
      </div>

      {/* FAQs */}
      {product.faqs && product.faqs.length > 0 && (
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-[#0F172A] mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {product.faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-gray-100 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-[#0F172A] text-sm">
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-50 pt-3">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {product.tags.map(tag => (
              <a
                key={tag}
                href={`/products?search=${encodeURIComponent(tag)}`}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
              >
                #{tag}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
