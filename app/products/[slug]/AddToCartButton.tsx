'use client'

import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import type { Product } from '@/types'

interface AddToCartButtonProps {
  product: Product
  image: string
}

export default function AddToCartButton({
  product,
  image,
}: AddToCartButtonProps) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.selling_price,
      image,
      slug: product.slug,
      qty: 1,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (product.stock_status === 'out_of_stock') {
    return (
      <button
        disabled
        className="w-full bg-gray-200 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed"
      >
        Out of Stock
      </button>
    )
  }

  return (
    <button
      onClick={handleAddToCart}
      className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-all duration-300 active:scale-95 ${
        added
          ? 'bg-green-500 text-white'
          : 'bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]'
      }`}
    >
      {added ? (
        <>
          <Check size={20} />
          Added to Cart!
        </>
      ) : (
        <>
          <ShoppingCart size={20} />
          Add to Cart
        </>
      )}
    </button>
  )
}
