'use client'

import { useState } from 'react'
import { formatZAR, cn } from '@/lib/utils'
import type { Product } from '@/types'
import {
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Package,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import Image from 'next/image'

interface ProductsTableProps {
  products: Product[]
  onTogglePublish?: (product: Product) => void
  onDelete?: (product: Product) => void
  onEdit?: (product: Product) => void
}

const supplierBadge: Record<string, string> = {
  aliexpress: 'bg-orange-50 text-orange-700',
  cj: 'bg-blue-50 text-blue-700',
  makro: 'bg-green-50 text-green-700',
  takealot: 'bg-blue-50 text-blue-800',
  game: 'bg-red-50 text-red-700',
  bidorbuy: 'bg-amber-50 text-amber-700',
  hivve: 'bg-teal-50 text-teal-700',
  gumtree: 'bg-purple-50 text-purple-700',
}

const supplierLabel: Record<string, string> = {
  aliexpress: 'AliExpress',
  cj: 'CJ Drop',
  makro: 'Makro',
  takealot: 'Takealot',
  game: 'Game',
  bidorbuy: 'BidOrBuy',
  hivve: 'Hivve',
  gumtree: 'Gumtree',
}

const stockBadge: Record<string, string> = {
  in_stock: 'bg-emerald-50 text-emerald-700',
  low_stock: 'bg-amber-50 text-amber-700',
  out_of_stock: 'bg-red-50 text-red-700',
}

export default function ProductsTable({
  products,
  onTogglePublish,
  onDelete,
  onEdit,
}: ProductsTableProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Package size={40} className="mx-auto mb-3 opacity-40" />
        <p className="font-medium">No products found</p>
        <p className="text-sm mt-1">Import products from the Suppliers page</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Product
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Supplier
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Cost
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Price
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Margin
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Stock
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Status
            </th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr
              key={product.id}
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {product.images?.[0] ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <button
                      onClick={() => onEdit?.(product)}
                      className="font-medium text-[#0F172A] hover:text-[#F59E0B] transition-colors text-left line-clamp-1"
                    >
                      {product.name}
                    </button>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {product.category} · {product.orders_count} orders
                    </p>
                  </div>
                </div>
              </td>

              <td className="py-3 px-4">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    supplierBadge[product.supplier] ||
                      'bg-gray-50 text-gray-600'
                  )}
                >
                  {supplierLabel[product.supplier] || product.supplier}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">
                  {product.supplier_shipping_days}d delivery
                </p>
              </td>

              <td className="py-3 px-4 text-right text-gray-600">
                {formatZAR(product.cost_price)}
              </td>

              <td className="py-3 px-4 text-right">
                <div className="font-semibold text-[#0F172A]">
                  {formatZAR(product.selling_price)}
                </div>
                {product.compare_at_price && (
                  <div className="text-xs text-gray-400 line-through">
                    {formatZAR(product.compare_at_price)}
                  </div>
                )}
              </td>

              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {product.margin_percent < 20 ? (
                    <AlertTriangle size={12} className="text-red-500" />
                  ) : (
                    <CheckCircle size={12} className="text-emerald-500" />
                  )}
                  <span
                    className={cn(
                      'font-semibold',
                      product.margin_percent < 20
                        ? 'text-red-500'
                        : product.margin_percent >= 30
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                    )}
                  >
                    {product.margin_percent.toFixed(1)}%
                  </span>
                </div>
              </td>

              <td className="py-3 px-4">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    stockBadge[product.stock_status] ||
                      'bg-gray-50 text-gray-600'
                  )}
                >
                  {product.stock_status.replace('_', ' ')}
                </span>
              </td>

              <td className="py-3 px-4">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    product.is_published
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {product.is_published ? 'Published' : 'Draft'}
                </span>
              </td>

              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <a
                    href={`/products/${product.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 rounded-lg transition-colors"
                    title="View in store"
                  >
                    <ExternalLink size={14} />
                  </a>

                  <button
                    onClick={() => onTogglePublish?.(product)}
                    className="p-1.5 text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 rounded-lg transition-colors"
                    title={product.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {product.is_published ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                  </button>

                  {confirmDelete === product.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDelete?.(product)
                          setConfirmDelete(null)
                        }}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
