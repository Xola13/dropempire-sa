'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  RefreshCw,
  AlertCircle,
  Store,
  Package,
  ShoppingBag,
  TrendingUp,
  ExternalLink,
  Edit2,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import WholesaleOpportunityCard from '@/components/admin/WholesaleOpportunityCard'
import { formatZAR, formatDate } from '@/lib/utils'

interface WholesaleOpportunity {
  id: string
  source: string
  name: string
  imageUrl: string
  url: string
  category: string
  costUSD: number
  costZAR: number
  minOrder: number
  suggestedPrice: number
  estimatedMargin: number
  soldCount: number
  rating: number
  supplierName?: string
  supplierCountry?: string
  isLocal?: boolean
  deliveryLabel?: string
}

interface MarketplaceListing {
  id: string
  product_id: string
  marketplace: 'takealot' | 'makro' | 'store'
  marketplace_sku: string
  marketplace_listing_id?: string
  marketplace_url?: string
  selling_price: number
  stock_quantity: number
  status: 'active' | 'inactive' | 'pending' | 'rejected'
  marketplace_fee_percent: number
  created_at: string
  products?: {
    name: string
    images: string[]
    category: string
  }
}

interface MarketplaceOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  payment_status: string
  order_source: 'takealot' | 'makro'
  created_at: string
  items: Array<{ name: string; qty: number; unit_price: number }>
}

const TABS = ['Find Opportunities', 'My Listings', 'Marketplace Orders'] as const
type Tab = (typeof TABS)[number]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
}

const MARKETPLACE_COLORS: Record<string, string> = {
  takealot: 'bg-blue-100 text-blue-700',
  makro: 'bg-red-100 text-red-700',
  store: 'bg-emerald-100 text-emerald-700',
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Find Opportunities')

  // Opportunities tab state
  const [keyword, setKeyword] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'local' | 'wholesale' | 'all'>('local')
  const [opportunities, setOpportunities] = useState<WholesaleOpportunity[]>([])
  const [oppLoading, setOppLoading] = useState(false)
  const [oppError, setOppError] = useState('')

  // Listings tab state
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [syncingOrders, setSyncingOrders] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState('')

  // Orders tab state
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const fetchOpportunities = useCallback(async () => {
    setOppLoading(true)
    setOppError('')
    try {
      const params = new URLSearchParams()
      if (keyword) params.set('q', keyword)
      params.set('source', sourceFilter)
      const res = await fetch(`/api/suppliers/bestsellers?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setOpportunities(data.results || [])
    } catch (err) {
      setOppError(err instanceof Error ? err.message : 'Failed to fetch wholesale products')
    } finally {
      setOppLoading(false)
    }
  }, [keyword, sourceFilter])

  const fetchListings = useCallback(async () => {
    setListingsLoading(true)
    try {
      const res = await fetch('/api/admin/marketplace/listings')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } finally {
      setListingsLoading(false)
    }
  }, [])

  const fetchMarketplaceOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/admin/orders?source=marketplace&limit=50')
      if (res.ok) {
        const data = await res.json()
        setMarketplaceOrders(
          (data.orders || []).filter(
            (o: MarketplaceOrder) => o.order_source === 'takealot' || o.order_source === 'makro'
          )
        )
      }
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'My Listings') fetchListings()
    if (activeTab === 'Marketplace Orders') fetchMarketplaceOrders()
  }, [activeTab, fetchListings, fetchMarketplaceOrders])

  const handleImportToStore = async (opp: WholesaleOpportunity) => {
    try {
      const res = await fetch('/api/suppliers/wholesale-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: opp.source,
          name: opp.name,
          imageUrl: opp.imageUrl,
          supplierUrl: opp.url,
          costUSD: opp.costUSD,
          costZAR: opp.costZAR,
          suggestedPrice: opp.suggestedPrice,
          category: opp.category,
          minOrder: opp.minOrder,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed')
      throw err
    }
  }

  const handleListOnTakealot = async (opp: WholesaleOpportunity) => {
    // First import the product, then list it
    try {
      // Try to find or create the product first
      const importRes = await fetch('/api/suppliers/wholesale-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: opp.source,
          name: opp.name,
          imageUrl: opp.imageUrl,
          supplierUrl: opp.url,
          costUSD: opp.costUSD,
          costZAR: opp.costZAR,
          suggestedPrice: opp.suggestedPrice,
          category: opp.category,
        }),
      })
      const importData = await importRes.json()
      const productId = importData.productId || importData.product?.id

      if (!productId) throw new Error('Could not import product')

      const listRes = await fetch('/api/marketplace/list-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          marketplace: 'takealot',
          sellingPrice: opp.suggestedPrice,
          stock: 50,
          rrp: Math.round(opp.suggestedPrice * 1.2),
        }),
      })
      const listData = await listRes.json()
      if (!listRes.ok) {
        if (listData.needsSetup) {
          alert('Takealot seller account not connected. Add your TAKEALOT_SELLER_API_KEY in Settings.')
          return
        }
        throw new Error(listData.error || 'Listing failed')
      }

      await fetchListings()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to list on Takealot')
      throw err
    }
  }

  const handleSyncOrders = async () => {
    setSyncingOrders(true)
    setSyncMessage('')
    try {
      const res = await fetch('/api/marketplace/sync')
      const data = await res.json()
      setSyncMessage(data.message || `Synced ${data.synced} orders`)
      await fetchMarketplaceOrders()
    } catch {
      setSyncMessage('Failed to sync orders')
    } finally {
      setSyncingOrders(false)
    }
  }

  const handleUpdatePrice = async (listingId: string) => {
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) return

    try {
      await fetch(`/api/admin/marketplace/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selling_price: price }),
      })
      setListings(prev =>
        prev.map(l => (l.id === listingId ? { ...l, selling_price: price } : l))
      )
      setEditingPrice(null)
    } catch {
      alert('Failed to update price')
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Marketplace</h1>
        <p className="text-gray-500 text-sm mt-1">
          Find wholesale products and list them on Takealot & Makro as a seller
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ================================================================
          TAB 1: Find Opportunities
      ================================================================ */}
      {activeTab === 'Find Opportunities' && (
        <div className="space-y-6">
          {/* Search Controls */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-[#0F172A] flex items-center gap-2">
              <TrendingUp size={18} className="text-[#F59E0B]" />
              Find Wholesale Bestsellers
            </h2>

            {/* Local / International toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSourceFilter('local')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  sourceFilter === 'local'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                }`}
              >
                🇿🇦 Local SA
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${sourceFilter === 'local' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  1-3 days
                </span>
              </button>
              <button
                onClick={() => setSourceFilter('wholesale')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  sourceFilter === 'wholesale'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                🌍 International
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${sourceFilter === 'wholesale' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  15-25 days
                </span>
              </button>
              <button
                onClick={() => setSourceFilter('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  sourceFilter === 'all'
                    ? 'bg-[#F59E0B] text-[#0F172A] border-[#F59E0B]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#F59E0B]'
                }`}
              >
                All Sources
              </button>
            </div>

            {/* Source info bar */}
            {sourceFilter === 'local' && (
              <div className="flex flex-wrap gap-2 text-xs">
                {['Takealot', 'Makro', 'Game', 'BidOrBuy', 'Gumtree Wholesale'].map(s => (
                  <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    🇿🇦 {s}
                  </span>
                ))}
              </div>
            )}

            {/* Suggested searches */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 self-center">Try:</span>
              {['electronics', 'homeware', 'beauty', 'toys', 'sporting goods'].map(s => (
                <button
                  key={s}
                  onClick={() => { setKeyword(s); }}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B] rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchOpportunities()}
                  placeholder="Search products (or leave blank for trending)"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20"
                />
              </div>

              <button
                onClick={fetchOpportunities}
                disabled={oppLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-60"
              >
                {oppLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Search size={15} />
                )}
                {keyword ? 'Search Products' : 'Find Bestsellers'}
              </button>
            </div>

            <p className="text-xs text-gray-400">
              {sourceFilter === 'local'
                ? 'SA local suppliers — no shipping cost, 1-3 business day delivery. Margins calculated at 35% target.'
                : sourceFilter === 'wholesale'
                ? `International suppliers — R85 shipping added to cost. Prices in ZAR at R${parseFloat(process.env.NEXT_PUBLIC_EXCHANGE_RATE_USD_ZAR || '18.5').toFixed(1)}/USD.`
                : `All sources shown. Local suppliers appear first. ZAR rate: R${parseFloat(process.env.NEXT_PUBLIC_EXCHANGE_RATE_USD_ZAR || '18.5').toFixed(1)}/USD.`
              }
            </p>
          </div>

          {/* Error */}
          {oppError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-700 text-sm border border-red-100">
              <AlertCircle size={16} className="flex-shrink-0" />
              {oppError}
            </div>
          )}

          {/* Loading */}
          {oppLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-100 rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!oppLoading && opportunities.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Found {opportunities.length} wholesale opportunities, sorted by estimated margin
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                    🇿🇦 = SA local, 1-3 days
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    🌍 = International, 15-25 days
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {opportunities.map(opp => (
                  <div key={opp.id} className="relative">
                    {opp.isLocal && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500 text-white rounded-full shadow">
                          FAST DELIVERY
                        </span>
                      </div>
                    )}
                    {opp.estimatedMargin >= 35 && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="text-xs font-bold px-2 py-0.5 bg-[#F59E0B] text-[#0F172A] rounded-full shadow">
                          BEST MARGIN
                        </span>
                      </div>
                    )}
                    <WholesaleOpportunityCard
                      opportunity={opp}
                      onImportToStore={handleImportToStore}
                      onListOnTakealot={handleListOnTakealot}
                    />
                    {/* Delivery badge overlay at bottom */}
                    <div className="absolute bottom-[4.5rem] left-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        opp.isLocal
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {opp.deliveryLabel || (opp.isLocal ? '🇿🇦 1-3 days' : '🌍 15-25 days')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!oppLoading && opportunities.length === 0 && !oppError && (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <TrendingUp size={40} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">
                Click "Find Bestsellers" to discover wholesale products
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {sourceFilter === 'local'
                  ? 'SA local sources: Takealot, Makro, Game, BidOrBuy'
                  : sourceFilter === 'wholesale'
                  ? 'International sources: DHgate, Alibaba'
                  : 'All sources — local SA suppliers shown first'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          TAB 2: My Listings
      ================================================================ */}
      {activeTab === 'My Listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-[#0F172A]">Active Marketplace Listings</h2>
              {syncMessage && (
                <span className="text-sm text-emerald-600 font-medium">{syncMessage}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchListings}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                onClick={handleSyncOrders}
                disabled={syncingOrders}
                className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0F172A] rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors disabled:opacity-60"
              >
                {syncingOrders ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Sync Orders
              </button>
            </div>
          </div>

          {listingsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <Store size={40} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">No marketplace listings yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Go to "Find Opportunities" to import and list products
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Marketplace</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Price</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Stock</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map(listing => (
                    <tr key={listing.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {listing.products?.images?.[0] ? (
                            <img
                              src={listing.products.images[0]}
                              alt=""
                              className="w-10 h-10 object-cover rounded-lg bg-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package size={14} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[#0F172A] line-clamp-1">
                              {listing.products?.name || listing.marketplace_sku}
                            </p>
                            <p className="text-xs text-gray-400">
                              SKU: {listing.marketplace_sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            MARKETPLACE_COLORS[listing.marketplace] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {listing.marketplace}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editingPrice === listing.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={newPrice}
                              onChange={e => setNewPrice(e.target.value)}
                              className="w-20 border border-[#F59E0B] rounded px-2 py-1 text-xs focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdatePrice(listing.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingPrice(null)}
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPrice(listing.id)
                              setNewPrice(String(listing.selling_price))
                            }}
                            className="flex items-center gap-1.5 group"
                          >
                            <span className="font-medium text-[#0F172A]">
                              {formatZAR(listing.selling_price)}
                            </span>
                            <Edit2
                              size={12}
                              className="text-gray-300 group-hover:text-[#F59E0B] transition-colors"
                            />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{listing.stock_quantity}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            STATUS_COLORS[listing.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {listing.marketplace_url && (
                          <a
                            href={listing.marketplace_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
                          >
                            View <ExternalLink size={12} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          TAB 3: Marketplace Orders
      ================================================================ */}
      {activeTab === 'Marketplace Orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#0F172A]">Orders from Takealot & Makro</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSyncOrders}
                disabled={syncingOrders}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-60"
              >
                {syncingOrders ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Sync Now
              </button>
            </div>
          </div>

          {syncMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">
              <Check size={16} />
              {syncMessage}
            </div>
          )}

          {ordersLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : marketplaceOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <ShoppingBag size={40} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">No marketplace orders yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Click "Sync Now" to pull in orders from Takealot and Makro
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Order</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Source</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Total</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {marketplaceOrders.map(order => (
                    <>
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/50 cursor-pointer"
                        onClick={() =>
                          setExpandedOrder(expandedOrder === order.id ? null : order.id)
                        }
                      >
                        <td className="px-5 py-3 font-medium text-[#0F172A]">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                              MARKETPLACE_COLORS[order.order_source] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {order.order_source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{order.customer_name}</td>
                        <td className="px-4 py-3 font-medium">{formatZAR(order.total)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-700">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr key={`${order.id}-detail`} className="bg-gray-50/50">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-gray-500 mb-2">Order items:</p>
                              {(order.items || []).map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-[#0F172A]">
                                    {item.name} × {item.qty}
                                  </span>
                                  <span className="text-gray-500">
                                    {formatZAR(item.unit_price * item.qty)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
