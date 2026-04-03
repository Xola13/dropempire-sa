'use client'

import { useState } from 'react'
import { Search, Package, Star, Clock, ExternalLink, Plus, Loader2 } from 'lucide-react'
import { formatZAR, cn } from '@/lib/utils'
import type { SupplierProduct } from '@/types'
import Image from 'next/image'

type Supplier = 'aliexpress' | 'cj' | 'makro' | 'all'

const supplierColors: Record<string, string> = {
  aliexpress: 'bg-orange-50 text-orange-700 border-orange-200',
  cj: 'bg-blue-50 text-blue-700 border-blue-200',
  makro: 'bg-green-50 text-green-700 border-green-200',
}

const deliveryDays: Record<string, string> = {
  aliexpress: '15-25 days',
  cj: '7-15 days',
  makro: '2-4 days',
}

interface SupplierSearchProps {
  onImport?: (product: SupplierProduct) => void
}

export default function SupplierSearch({ onImport }: SupplierSearchProps) {
  const [query, setQuery] = useState('')
  const [supplier, setSupplier] = useState<Supplier>('all')
  const [results, setResults] = useState<SupplierProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const params = new URLSearchParams({ query: query.trim() })
      if (supplier !== 'all') params.set('supplier', supplier)

      const res = await fetch(`/api/suppliers/search?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (product: SupplierProduct) => {
    setImportingId(product.id)
    try {
      const res = await fetch('/api/suppliers/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      onImport?.(product)
      alert(`Product "${product.name}" imported successfully!`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for products (e.g. 'wireless earbuds', 'yoga mat')"
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Search
          </button>
        </div>

        {/* Supplier Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'aliexpress', 'cj', 'makro'] as Supplier[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSupplier(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                supplier === s
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              {s === 'all'
                ? 'All Suppliers'
                : s === 'aliexpress'
                  ? 'AliExpress (15-25d)'
                  : s === 'cj'
                    ? 'CJ Dropshipping (7-15d)'
                    : 'Makro (2-4d)'}
            </button>
          ))}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && results.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try a different search term or supplier</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {results.length} results for &ldquo;{query}&rdquo;
          </p>

          <div className="grid grid-cols-1 gap-3">
            {results.map(product => {
              const priceZAR = product.priceZAR ?? product.price
              const sellingPrice = Math.ceil(priceZAR * 2.5) // rough 2.5x markup
              const margin = ((sellingPrice - priceZAR) / sellingPrice) * 100

              return (
                <div
                  key={`${product.supplier}-${product.id}`}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow"
                >
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#0F172A] text-sm line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                              supplierColors[product.supplier] ||
                                'bg-gray-50 text-gray-600 border-gray-200'
                            )}
                          >
                            {product.supplier}
                          </span>

                          {product.rating && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              {product.rating.toFixed(1)}
                              {product.reviewCount && (
                                <span className="text-gray-400">
                                  ({product.reviewCount.toLocaleString()})
                                </span>
                              )}
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={10} />
                            {deliveryDays[product.supplier] ||
                              product.shippingDays ||
                              'Unknown'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-[#0F172A]">
                          {formatZAR(priceZAR)}
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            cost
                          </span>
                        </div>
                        <div className="text-xs text-emerald-600 font-medium mt-0.5">
                          Sell ~{formatZAR(sellingPrice)} ({margin.toFixed(0)}% margin)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {product.url && (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ExternalLink size={10} />
                          View on {product.supplier}
                        </a>
                      )}

                      <button
                        onClick={() => handleImport(product)}
                        disabled={importingId === product.id}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] text-[#0F172A] rounded-lg text-xs font-semibold hover:bg-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importingId === product.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Plus size={12} />
                        )}
                        {importingId === product.id ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
