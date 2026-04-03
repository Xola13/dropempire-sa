'use client'

import { useState } from 'react'
import { Search, Package, ShoppingBag, Store, ChevronRight, Plus, Check, AlertCircle, ExternalLink, Truck } from 'lucide-react'

interface SupplierProduct {
  id: string
  name: string
  supplierPrice: number
  originalPrice: number | null
  image: string
  url: string
  inStock: boolean
  deliveryDays: string
  supplier: string
  suggestedPrice: number
  estimatedMargin: number
}

interface ImportForm {
  name: string
  description: string
  category: string
  sellingPrice: number
  images: string[]
}

const SUPPLIERS = [
  { id: 'takealot', label: 'Takealot', flag: '🇿🇦', delivery: '1-3 days', color: 'bg-blue-500', desc: 'SA biggest store — fastest delivery', isLocal: true },
  { id: 'makro', label: 'Makro', flag: '🇿🇦', delivery: '2-4 days', color: 'bg-red-500', desc: 'Electronics, appliances, bulk goods', isLocal: true },
  { id: 'game', label: 'Game', flag: '🇿🇦', delivery: '1-3 days', color: 'bg-orange-500', desc: 'Electronics, toys, appliances', isLocal: true },
  { id: 'bidorbuy', label: 'BidOrBuy', flag: '🇿🇦', delivery: '1-3 days', color: 'bg-yellow-500', desc: "SA's biggest marketplace — cheap wholesale", isLocal: true },
  { id: 'gumtree', label: 'Gumtree', flag: '🇿🇦', delivery: '1-3 days', color: 'bg-green-500', desc: 'Wholesale & bulk lots from SA sellers', isLocal: true },
  { id: 'hivve', label: 'Hivve', flag: '🇿🇦', delivery: '2-5 days', color: 'bg-teal-500', desc: 'SA B2B wholesale — tech & accessories', isLocal: true },
  { id: 'cj', label: 'CJ Dropshipping', flag: '🌍', delivery: '7-15 days', color: 'bg-purple-500', desc: 'International — wide variety', isLocal: false },
]

const LOCAL_SUPPLIERS = SUPPLIERS.filter(s => s.isLocal)
const INTL_SUPPLIERS = SUPPLIERS.filter(s => !s.isLocal)

const CATEGORIES = ['Electronics', 'Beauty & Health', 'Home & Garden', 'Fashion', 'Toys & Games', 'Sports & Outdoors', 'Kitchen', 'Office', 'Pet Supplies', 'General']

export default function ManualImportPage() {
  const [activeSupplier, setActiveSupplier] = useState('takealot')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SupplierProduct[]>([])
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<SupplierProduct | null>(null)
  const [form, setForm] = useState<ImportForm>({ name: '', description: '', category: 'General', sellingPrice: 0, images: [] })
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState('')
  const [importError, setImportError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    setSearchError('')
    setSelected(null)
    setImportSuccess('')

    try {
      const res = await fetch(`/api/suppliers/browse?q=${encodeURIComponent(query)}&supplier=${activeSupplier}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.products || [])
      if ((data.products || []).length === 0) setSearchError('No products found. Try a different keyword.')
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function selectProduct(p: SupplierProduct) {
    setSelected(p)
    setForm({
      name: p.name,
      description: `${p.name} — Available for fast delivery in South Africa. Order today and receive within ${p.deliveryDays}.`,
      category: 'General',
      sellingPrice: p.suggestedPrice,
      images: p.image ? [p.image] : [],
    })
    setImportSuccess('')
    setImportError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function calcMargin() {
    if (!selected || !form.sellingPrice) return 0
    const shipping = selected.supplier === 'takealot' || selected.supplier === 'makro' ? 0 : selected.supplier === 'cj' ? 65 : 85
    const fee = form.sellingPrice * 0.035
    const net = form.sellingPrice - selected.supplierPrice - shipping - fee
    return (net / form.sellingPrice) * 100
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setImporting(true)
    setImportError('')
    setImportSuccess('')

    try {
      const res = await fetch('/api/suppliers/manual-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          images: form.images,
          category: form.category,
          sellingPrice: form.sellingPrice,
          supplierPrice: selected.supplierPrice,
          supplier: selected.supplier,
          supplierProductId: selected.id,
          supplierProductUrl: selected.url,
          deliveryDays: selected.deliveryDays,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportSuccess(data.message)
      setSelected(null)
      setResults([])
      setQuery('')
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const margin = calcMargin()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Import Products</h1>
        <p className="text-gray-500 text-sm mt-1">Search live products from SA suppliers — no API keys needed</p>
      </div>

      {/* Success banner */}
      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Product Imported!</p>
            <p className="text-green-700 text-sm mt-0.5">{importSuccess}</p>
            <a href="/admin/products" className="text-green-700 font-semibold text-sm underline mt-1 inline-block">
              Go to Products to publish it →
            </a>
          </div>
        </div>
      )}

      {/* Import form — shows when product selected */}
      {selected && (
        <div className="bg-white border-2 border-[#F59E0B] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center">
              <Plus size={16} className="text-[#0F172A]" />
            </div>
            <h2 className="font-bold text-[#0F172A]">Import This Product</h2>
          </div>

          <div className="flex gap-4 mb-6">
            {selected.image && (
              <img src={selected.image} alt={selected.name} className="w-24 h-24 object-cover rounded-lg border flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm line-clamp-2">{selected.name}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-gray-500">Supplier cost: <strong className="text-gray-800">R{selected.supplierPrice.toFixed(2)}</strong></span>
                <span className="flex items-center gap-1 text-gray-500"><Truck size={12} />{selected.deliveryDays}</span>
              </div>
              <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1 mt-1 hover:underline">
                View on {selected.supplier} <ExternalLink size={10} />
              </a>
            </div>
          </div>

          <form onSubmit={handleImport} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Selling Price (ZAR)</label>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={e => setForm(f => ({ ...f, sellingPrice: parseFloat(e.target.value) || 0 }))}
                  step="10"
                  min={selected.supplierPrice}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  required
                />
              </div>
            </div>

            {/* Margin indicator */}
            <div className={`rounded-lg p-3 flex items-center justify-between ${margin >= 25 ? 'bg-green-50 border border-green-200' : margin >= 15 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="text-sm">
                <span className="font-semibold">Estimated Margin: </span>
                <span className={`font-bold text-lg ${margin >= 25 ? 'text-green-700' : margin >= 15 ? 'text-yellow-700' : 'text-red-700'}`}>
                  {margin.toFixed(1)}%
                </span>
                <span className="text-gray-500 ml-2 text-xs">(after PayFast 3.5% fee)</span>
              </div>
              <div className="text-right text-sm">
                <p className="text-gray-600">Your profit per sale</p>
                <p className={`font-bold ${margin >= 25 ? 'text-green-700' : 'text-red-700'}`}>
                  R{((form.sellingPrice * margin) / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {margin < 15 && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                Margin below 15% — increase your selling price before importing.
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                {importError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={importing || margin < 10}
                className="flex-1 bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {importing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</>
                ) : (
                  <><Plus size={16} /> Import to Store</>
                )}
              </button>
              <button type="button" onClick={() => setSelected(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Section label — Local SA */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">🇿🇦 SA Local Suppliers — Fast Delivery</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">1-3 days</span>
        </div>
        <div className="grid grid-cols-5 border-b border-gray-100">
          {LOCAL_SUPPLIERS.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSupplier(s.id); setResults([]); setSearchError('') }}
              className={`p-3 text-left transition-colors ${activeSupplier === s.id ? 'bg-emerald-700 text-white' : 'hover:bg-emerald-50 text-gray-700'}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{s.flag}</span>
                <div>
                  <p className="font-semibold text-xs">{s.label}</p>
                  <p className={`text-xs mt-0.5 ${activeSupplier === s.id ? 'text-emerald-200' : 'text-emerald-600'} font-medium`}>{s.delivery}</p>
                </div>
              </div>
              <p className={`text-xs mt-1.5 ${activeSupplier === s.id ? 'text-emerald-100' : 'text-gray-400'} line-clamp-1`}>{s.desc}</p>
            </button>
          ))}
        </div>

        {/* Section label — International (collapsed look) */}
        <details className="border-b border-gray-100">
          <summary className="px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-gray-50 list-none">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">🌍 International Suppliers</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">15-25 days</span>
            <span className="ml-auto text-xs text-gray-400">Click to expand</span>
          </summary>
          <div className="grid grid-cols-1 border-t border-gray-100">
            {INTL_SUPPLIERS.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSupplier(s.id); setResults([]); setSearchError('') }}
                className={`p-3 text-left transition-colors ${activeSupplier === s.id ? 'bg-[#0F172A] text-white' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.flag}</span>
                  <div>
                    <p className="font-semibold text-sm">{s.label}</p>
                    <p className={`text-xs mt-0.5 ${activeSupplier === s.id ? 'text-gray-300' : 'text-gray-500'}`}>{s.delivery}</p>
                  </div>
                </div>
                <p className={`text-xs mt-1 ${activeSupplier === s.id ? 'text-[#F59E0B]' : 'text-gray-400'}`}>{s.desc}</p>
              </button>
            ))}
          </div>
        </details>

        {/* CJ notice */}
        {activeSupplier === 'cj' && (
          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-purple-700 text-xs">
              CJ Dropshipping requires a free account. Sign up at <strong>cjdropshipping.com</strong>, then add your <strong>CJ_EMAIL</strong> and <strong>CJ_API_KEY</strong> to .env.local. International delivery: 7-15 business days to SA.
            </p>
          </div>
        )}

        {/* Gumtree notice */}
        {activeSupplier === 'gumtree' && (
          <div className="bg-green-50 border-b border-green-100 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-xs">
              Gumtree wholesale searches for bulk/joblot listings from SA sellers. Results are filtered for wholesale keywords. Contact sellers directly to negotiate bulk pricing.
            </p>
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={handleSearch} className="p-4 flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${SUPPLIERS.find(s => s.id === activeSupplier)?.label} products...`}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="bg-[#F59E0B] hover:bg-amber-500 disabled:opacity-50 text-[#0F172A] font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            {searching ? <div className="w-4 h-4 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" /> : <Search size={16} />}
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results */}
        {searchError && (
          <div className="px-4 pb-4 text-center text-gray-500 text-sm">{searchError}</div>
        )}

        {results.length > 0 && (
          <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map(p => {
              const isLocal = SUPPLIERS.find(s => s.id === activeSupplier)?.isLocal ?? false
              const isBestMargin = p.estimatedMargin >= 35
              return (
                <div key={p.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow group relative">
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package size={40} />
                      </div>
                    )}
                    {!p.inStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded">Out of Stock</span>
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {isLocal && (
                        <span className="text-xs font-bold px-1.5 py-0.5 bg-emerald-500 text-white rounded shadow">FAST</span>
                      )}
                      {isBestMargin && (
                        <span className="text-xs font-bold px-1.5 py-0.5 bg-[#F59E0B] text-[#0F172A] rounded shadow">BEST MARGIN</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-700 line-clamp-2 leading-snug">{p.name}</p>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Cost</span>
                        <span className="font-bold text-gray-800 text-sm">R{p.supplierPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Sell for</span>
                        <span className="font-bold text-[#F59E0B] text-sm">R{p.suggestedPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Est. margin</span>
                        <span className={`text-xs font-semibold ${isBestMargin ? 'text-[#F59E0B]' : 'text-green-600'}`}>~{p.estimatedMargin}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-2">
                      <Truck size={10} className={isLocal ? 'text-emerald-500' : 'text-gray-400'} />
                      <span className={`text-xs ${isLocal ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>{p.deliveryDays}</span>
                    </div>

                    <button
                      onClick={() => selectProduct(p)}
                      disabled={!p.inStock}
                      className="mt-3 w-full bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      Import <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!searching && results.length === 0 && !searchError && (
          <div className="p-12 text-center text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">Search for products to import</p>
            <p className="text-sm mt-1">Try: "wireless earbuds", "skincare", "kitchen gadgets"</p>
          </div>
        )}
      </div>
    </div>
  )
}
