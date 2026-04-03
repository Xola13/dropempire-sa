'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/store/ProductCard'
import { Search, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react'
import type { Product } from '@/types'

const categories = [
  'All',
  'Electronics',
  'Home & Garden',
  'Beauty',
  'Sports',
  'Pet Supplies',
  'Kitchen',
  'Clothing',
  'Toys',
  'Health',
  'Automotive',
]

const sortOptions = [
  { label: 'Newest First', value: 'created_at', order: 'desc' },
  { label: 'Price: Low to High', value: 'price', order: 'asc' },
  { label: 'Price: High to Low', value: 'price', order: 'desc' },
  { label: 'Most Popular', value: 'popular', order: 'desc' },
]

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(
    searchParams.get('category') || 'All'
  )
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const LIMIT = 20

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: LIMIT.toString(),
        sort,
        order,
      })
      if (category && category !== 'All') params.set('category', category)
      if (search) params.set('search', search)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)

      const res = await fetch(`/api/store/products?${params}`)
      const data = await res.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [page, sort, order, category, search, minPrice, maxPrice])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchProducts()
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F172A]">
          {category !== 'All' ? category : 'All Products'}
        </h1>
        {total > 0 && (
          <p className="text-gray-500 mt-1">
            {total} product{total !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          {/* Mobile filter toggle */}
          <button
            className="lg:hidden w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 font-medium text-gray-700"
            onClick={() => setFilterOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} />
              Filters
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`space-y-6 ${filterOpen ? 'block' : 'hidden lg:block'}`}
          >
            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-[#0F172A] mb-3 text-sm">
                Search
              </h3>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </form>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-[#0F172A] mb-3 text-sm">
                Category
              </h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat)
                      setPage(1)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat
                        ? 'bg-amber-50 text-amber-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-[#0F172A] mb-3 text-sm">
                Price (ZAR)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                onClick={() => {
                  setPage(1)
                  fetchProducts()
                }}
                className="mt-3 w-full bg-[#0F172A] text-white text-sm font-medium py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              Showing {products.length} of {total} products
            </p>
            <select
              value={`${sort}-${order}`}
              onChange={e => {
                const [s, o] = e.target.value.split('-')
                setSort(s)
                setOrder(o)
                setPage(1)
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
            >
              {sortOptions.map(opt => (
                <option
                  key={`${opt.value}-${opt.order}`}
                  value={`${opt.value}-${opt.order}`}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-amber-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1">
                Try adjusting your filters or search terms
              </p>
              <button
                onClick={() => {
                  setSearch('')
                  setCategory('All')
                  setMinPrice('')
                  setMaxPrice('')
                  setPage(1)
                }}
                className="mt-4 text-amber-600 hover:text-amber-700 font-medium text-sm"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-[#0F172A] text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() =>
                      setPage(p => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
