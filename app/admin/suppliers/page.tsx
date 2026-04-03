'use client'

import SupplierSearch from '@/components/admin/SupplierSearch'
import { Package, Clock, TrendingUp, AlertCircle } from 'lucide-react'

const supplierInfo = [
  {
    name: 'AliExpress',
    key: 'aliexpress',
    color: 'border-orange-200 bg-orange-50',
    iconColor: 'text-orange-500',
    delivery: '15–25 business days',
    margin: 'High (60–80%)',
    risk: 'Long shipping, quality varies',
    best: 'Trending gadgets, accessories, novelty items',
  },
  {
    name: 'CJ Dropshipping',
    key: 'cj',
    color: 'border-blue-200 bg-blue-50',
    iconColor: 'text-blue-500',
    delivery: '7–15 business days',
    margin: 'Good (40–60%)',
    risk: 'MOQ sometimes required',
    best: 'Electronics, fashion, home goods',
  },
  {
    name: 'Makro SA',
    key: 'makro',
    color: 'border-green-200 bg-green-50',
    iconColor: 'text-green-600',
    delivery: '2–4 business days',
    margin: 'Lower (20–35%)',
    risk: 'Lower margins, price-match risk',
    best: 'Local trust signal, fast delivery promise',
  },
]

export default function AdminSuppliersPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Suppliers</h1>
        <p className="text-gray-500 text-sm mt-1">
          Search and import products from AliExpress, CJ Dropshipping, and Makro SA
        </p>
      </div>

      {/* Supplier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {supplierInfo.map(supplier => (
          <div
            key={supplier.key}
            className={`border rounded-xl p-5 ${supplier.color}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className={supplier.iconColor} />
              <h3 className="font-semibold text-[#0F172A]">{supplier.name}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Clock size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">{supplier.delivery}</span>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Margin: {supplier.margin}</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">{supplier.risk}</span>
              </div>
              <div className="pt-1 text-xs text-gray-500 font-medium">
                Best for: {supplier.best}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Honesty Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-2 font-semibold text-amber-800 text-sm mb-1">
          <AlertCircle size={16} className="text-amber-500" />
          Honest Delivery Policy
        </div>
        <p className="text-amber-700 text-sm">
          We always show customers honest delivery estimates. AliExpress products show
          &ldquo;15–25 days&rdquo;, CJ shows &ldquo;7–15 days&rdquo;, and Makro shows &ldquo;2–4 days&rdquo;.
          Never misrepresent delivery times to customers.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="font-semibold text-[#0F172A] mb-4">Search Products</h2>
        <SupplierSearch
          onImport={product => {
            console.log('Imported:', product.name)
          }}
        />
      </div>
    </div>
  )
}
