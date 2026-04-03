'use client'

import { useEffect, useState, useCallback } from 'react'
import ProductsTable from '@/components/admin/ProductsTable'
import type { Product } from '@/types'
import { Plus, RefreshCw, Search, Filter } from 'lucide-react'

const CATEGORIES = [
  'All',
  'Electronics',
  'Home & Garden',
  'Beauty',
  'Sports',
  'Pet Supplies',
  'Kitchen',
  'Fashion',
  'Toys',
  'Health',
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [total, setTotal] = useState(0)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category !== 'All') params.set('category', category)
      if (publishedFilter !== 'all') params.set('published', publishedFilter === 'published' ? 'true' : 'false')
      params.set('limit', '50')

      const res = await fetch(`/api/admin/products?${params}`)
      const data = await res.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, category, publishedFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleTogglePublish = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !product.is_published }),
      })
      if (res.ok) {
        setProducts(prev =>
          prev.map(p =>
            p.id === product.id
              ? { ...p, is_published: !product.is_published }
              : p
          )
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== product.id))
        setTotal(prev => prev - 1)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{total} products total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="p-2 text-gray-500 hover:text-[#0F172A] hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <a
            href="/admin/suppliers"
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0F172A] rounded-xl text-sm font-semibold hover:bg-[#D97706] transition-colors"
          >
            <Plus size={14} />
            Import Products
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={publishedFilter}
            onChange={e => setPublishedFilter(e.target.value as typeof publishedFilter)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : (
          <ProductsTable
            products={products}
            onTogglePublish={handleTogglePublish}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
