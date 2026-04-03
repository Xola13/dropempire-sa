'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart, Star } from 'lucide-react'
import { formatZAR, getDeliveryLabel } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart'
import type { Product } from '@/types'

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore(s => s.addItem)
  const image =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({
      id: product.id,
      name: product.name,
      price: product.selling_price,
      image,
      slug: product.slug,
      qty: 1,
    })
  }

  const discount = product.compare_at_price
    ? Math.round(
        ((product.compare_at_price - product.selling_price) /
          product.compare_at_price) *
          100
      )
    : 0

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              -{discount}%
            </span>
          )}
          {product.stock_status === 'out_of_stock' && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-gray-800 text-sm line-clamp-2 hover:text-amber-600 transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>

        {product.orders_count > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star
              size={12}
              className="text-yellow-400 fill-yellow-400"
            />
            <span className="text-xs text-gray-500">
              {product.orders_count} sold
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-bold text-gray-900 text-lg">
              {formatZAR(product.selling_price)}
            </span>
            {product.compare_at_price && (
              <span className="text-gray-400 text-sm line-through ml-2">
                {formatZAR(product.compare_at_price)}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={product.stock_status === 'out_of_stock'}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 p-2 rounded-lg transition-colors active:scale-95"
          >
            <ShoppingCart size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          {getDeliveryLabel(product.supplier)}
        </p>
      </div>
    </motion.div>
  )
}
