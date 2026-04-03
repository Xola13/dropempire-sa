'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Search,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ExternalLink,
  Package,
  Loader2,
  Download,
} from 'lucide-react'

// Types matching the API response
interface CompareProduct {
  id: string
  name: string
  price: number
  image: string
  url: string
  supplier: string
  supplierLabel: string
  flag: string
  deliveryDays: string
  suggestedSellingPrice: number
  estimatedMargin: number
  inStock: boolean
}

interface ArbitrageResult {
  buyFrom: CompareProduct
  sellOn: CompareProduct
  buyPrice: number
  sellPrice: number
  grossProfit: number
  netProfit: number
  marginPercent: number
}

interface CompareResult {
  query: string
  totalResults: number
  products: CompareProduct[]
  arbitrage: ArbitrageResult | null
  breakdown: { takealot: number; makro: number; game: number; bidorbuy: number }
}

const SUGGESTIONS = [
  'wireless earbuds',
  'hair dryer',
  'power bank',
  'kettle',
  'bluetooth speaker',
  'gaming mouse',
]

const SUPPLIER_COLORS: Record<string, string> = {
  takealot: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  makro: 'bg-red-500/20 text-red-300 border border-red-500/30',
  game: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  bidorbuy: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
}

function formatPrice(price: number): string {
  return `R${price.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function SupplierBadge({ supplier, label, flag }: { supplier: string; label: string; flag: string }) {
  const colorClass = SUPPLIER_COLORS[supplier] ?? 'bg-white/10 text-gray-300 border border-white/10'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${colorClass}`}>
      <span>{flag}</span>
      {label}
    </span>
  )
}

function SearchingSkeleton() {
  const suppliers = ['Takealot', 'Makro', 'Game', 'BidOrBuy']
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {suppliers.map(s => (
        <div
          key={s}
          className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          <div className="text-center">
            <p className="text-white text-xs font-medium">Searching {s}...</p>
            <div className="mt-2 h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#F59E0B]/50 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PriceComparePage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/suppliers/compare?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: CompareResult = await res.json()
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSuggestion(s: string) {
    setQuery(s)
    handleSearch(s)
  }

  async function handleImport(product: CompareProduct) {
    setImportingId(product.id)
    try {
      await fetch('/api/suppliers/manual-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          supplierPrice: product.price,
          sellingPrice: product.suggestedSellingPrice,
          images: product.image ? [product.image] : [],
          supplierProductUrl: product.url,
          supplier: product.supplier,
          deliveryDays: product.deliveryDays,
          category: 'General',
        }),
      })
      setImportedIds(prev => new Set([...prev, product.id]))
    } catch {
      // silently fail — don't interrupt UX
    } finally {
      setImportingId(null)
    }
  }

  const products = result?.products ?? []
  const cheapestId = products.find(p => p.inStock)?.id
  const mostExpensiveId = [...products].reverse().find(p => p.inStock)?.id

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight className="w-5 h-5 text-[#F59E0B]" />
            <h1 className="text-2xl font-bold text-white">Price Compare</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Find the cheapest source, sell on the most expensive platform
          </p>
        </div>
      </div>

      {/* Search form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. wireless earbuds, hair dryer, power bank..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-colors text-sm"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-[#F59E0B] text-[#0F172A] font-bold rounded-xl hover:bg-[#FBBF24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4" />
                Compare All
              </>
            )}
          </button>
        </div>

        {/* Quick suggestion chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-gray-500 text-xs self-center">Quick search:</span>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              disabled={loading}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs rounded-full border border-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state — 4 supplier skeleton boxes */}
      {loading && (
        <div className="space-y-4">
          <SearchingSkeleton />
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="divide-y divide-white/5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-6 h-4 bg-white/10 rounded animate-pulse" />
                  <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
                  </div>
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-3">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <div>
            <p className="text-red-400 font-medium text-sm mb-1">Search failed</p>
            <p className="text-red-400/70 text-xs">{error}</p>
            <button
              onClick={() => handleSearch()}
              className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Supplier breakdown bar */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {Object.entries(result.breakdown).map(([supplier, count]) => (
              <div key={supplier} className="flex items-center gap-2">
                <SupplierBadge
                  supplier={supplier}
                  label={`${supplier.charAt(0).toUpperCase() + supplier.slice(1)} (${count})`}
                  flag="🇿🇦"
                />
              </div>
            ))}
            <span className="text-gray-400 text-sm ml-auto font-medium">
              Total: {result.totalResults} results
            </span>
          </div>

          {/* Arbitrage box */}
          {result.arbitrage && (
            <div className="bg-[#0D1E3A] border-2 border-[#F59E0B]/60 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-[#F59E0B]/10 px-5 py-3 border-b border-[#F59E0B]/20 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
                <h2 className="text-[#F59E0B] font-bold">Best Arbitrage Opportunity</h2>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  {/* BUY side */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingDown className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-bold text-xs uppercase tracking-wide">Buy From</span>
                    </div>
                    <div className="flex items-start gap-3">
                      {result.arbitrage.buyFrom.image ? (
                        <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                          <Image
                            src={result.arbitrage.buyFrom.image}
                            alt={result.arbitrage.buyFrom.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-white/5 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-2 leading-tight mb-2">
                          {result.arbitrage.buyFrom.name}
                        </p>
                        <SupplierBadge
                          supplier={result.arbitrage.buyFrom.supplier}
                          label={result.arbitrage.buyFrom.supplierLabel}
                          flag={result.arbitrage.buyFrom.flag}
                        />
                      </div>
                    </div>
                    <p className="text-green-400 text-2xl font-bold mt-3">
                      {formatPrice(result.arbitrage.buyPrice)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="w-10 h-10 bg-[#F59E0B] rounded-full flex items-center justify-center flex-shrink-0">
                      <ArrowLeftRight className="w-5 h-5 text-[#0F172A]" />
                    </div>
                  </div>

                  {/* SELL side */}
                  <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-[#F59E0B] font-bold text-xs uppercase tracking-wide">Sell On</span>
                    </div>
                    <div className="flex items-start gap-3">
                      {result.arbitrage.sellOn.image ? (
                        <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                          <Image
                            src={result.arbitrage.sellOn.image}
                            alt={result.arbitrage.sellOn.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-white/5 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-2 leading-tight mb-2">
                          {result.arbitrage.sellOn.name}
                        </p>
                        <SupplierBadge
                          supplier={result.arbitrage.sellOn.supplier}
                          label={result.arbitrage.sellOn.supplierLabel}
                          flag={result.arbitrage.sellOn.flag}
                        />
                      </div>
                    </div>
                    <p className="text-[#F59E0B] text-2xl font-bold mt-3">
                      {formatPrice(result.arbitrage.sellPrice)}
                    </p>
                  </div>
                </div>

                {/* Profit summary */}
                <div className="mt-4 bg-white/5 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-gray-400">
                      Gross profit:{' '}
                      <span className="text-white font-semibold">
                        {formatPrice(result.arbitrage.grossProfit)}
                      </span>
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">
                      Net after PayFast fees:{' '}
                      <span className="text-green-400 font-semibold">
                        {formatPrice(result.arbitrage.netProfit)}
                      </span>
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">
                      Margin:{' '}
                      <span className="text-[#F59E0B] font-bold text-base">
                        {result.arbitrage.marginPercent}%
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleImport(result.arbitrage!.buyFrom)}
                    disabled={
                      importingId === result.arbitrage.buyFrom.id ||
                      importedIds.has(result.arbitrage.buyFrom.id)
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0F172A] text-sm font-bold rounded-lg hover:bg-[#FBBF24] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {importedIds.has(result.arbitrage.buyFrom.id) ? (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Imported
                      </>
                    ) : importingId === result.arbitrage.buyFrom.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Import Cheapest Product
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No arbitrage notice */}
          {result.totalResults > 0 && !result.arbitrage && (
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 text-sm">
              Prices are within 20% of each other — no significant arbitrage opportunity detected.
            </div>
          )}

          {/* Full results table */}
          {result.totalResults > 0 && (
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">
                  All Results — sorted cheapest to most expensive
                </h3>
                <span className="text-gray-500 text-xs">
                  {result.totalResults} product{result.totalResults !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-white/5">
                      <th className="px-4 py-3 text-left w-10">#</th>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Suggested</th>
                      <th className="px-4 py-3 text-right">Margin</th>
                      <th className="px-4 py-3 text-left">Source</th>
                      <th className="px-4 py-3 text-left">Delivery</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => {
                      const isCheapest = product.id === cheapestId
                      const isMostExpensive =
                        product.id === mostExpensiveId && products.length > 1
                      const isImported = importedIds.has(product.id)
                      const isImporting = importingId === product.id

                      return (
                        <tr
                          key={product.id}
                          className={[
                            'border-b border-white/5 transition-colors',
                            isCheapest
                              ? 'border-l-2 border-l-green-500 bg-green-500/5 hover:bg-green-500/10'
                              : isMostExpensive
                              ? 'border-l-2 border-l-[#F59E0B] bg-[#F59E0B]/5 hover:bg-[#F59E0B]/10'
                              : 'hover:bg-white/3',
                          ].join(' ')}
                        >
                          {/* Rank */}
                          <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                            {idx + 1}
                          </td>

                          {/* Product */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {product.image ? (
                                <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                                  <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white/5 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-gray-600" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-white text-sm font-medium leading-tight line-clamp-2 max-w-xs">
                                  {product.name.length > 50
                                    ? product.name.slice(0, 50) + '...'
                                    : product.name}
                                </p>
                                {isCheapest && (
                                  <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold">
                                    CHEAPEST
                                  </span>
                                )}
                                {isMostExpensive && (
                                  <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-semibold">
                                    SELL HERE
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 text-right">
                            <p
                              className={`font-bold text-sm ${
                                isCheapest
                                  ? 'text-green-400'
                                  : isMostExpensive
                                  ? 'text-[#F59E0B]'
                                  : 'text-white'
                              }`}
                            >
                              {formatPrice(product.price)}
                            </p>
                          </td>

                          {/* Suggested selling price */}
                          <td className="px-4 py-3 text-right">
                            <p className="text-gray-300 text-sm font-medium">
                              {formatPrice(product.suggestedSellingPrice)}
                            </p>
                          </td>

                          {/* Margin */}
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                product.estimatedMargin >= 30
                                  ? 'bg-green-500/20 text-green-400'
                                  : product.estimatedMargin >= 15
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {product.estimatedMargin}%
                            </span>
                          </td>

                          {/* Supplier */}
                          <td className="px-4 py-3">
                            <SupplierBadge
                              supplier={product.supplier}
                              label={product.supplierLabel}
                              flag={product.flag}
                            />
                          </td>

                          {/* Delivery */}
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {product.deliveryDays}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                title="View on site"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleImport(product)}
                                disabled={isImporting || isImported}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                                  isImported
                                    ? 'bg-green-500/20 text-green-400 cursor-default'
                                    : 'bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 disabled:opacity-50'
                                }`}
                              >
                                {isImported ? (
                                  'Imported'
                                ) : isImporting ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    ...
                                  </>
                                ) : (
                                  'Import'
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty results */}
          {result.totalResults === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">
                No results found for &quot;{result.query}&quot;
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Suppliers may be blocking the scraper or the product doesn&apos;t exist under
                that name. Try a broader search term.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm rounded-full border border-white/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!result && !loading && !error && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-[#F59E0B]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ArrowLeftRight className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <p className="text-white font-bold text-lg mb-2">
            Search across all SA suppliers at once
          </p>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Compare Takealot, Makro, Game, and BidOrBuy side-by-side. Instantly see where to
            buy cheapest and where to sell highest for maximum profit.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <p className="text-gray-500 text-sm w-full mb-2">Try searching for:</p>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm rounded-full border border-white/10 hover:border-white/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
