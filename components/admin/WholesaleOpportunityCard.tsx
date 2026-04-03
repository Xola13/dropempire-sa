'use client'

import { useState } from 'react'
import { ExternalLink, Package, TrendingUp, ShoppingBag, Star } from 'lucide-react'
import { formatZAR } from '@/lib/utils'

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

interface WholesaleOpportunityCardProps {
  opportunity: WholesaleOpportunity
  onImportToStore: (opp: WholesaleOpportunity) => Promise<void>
  onListOnTakealot: (opp: WholesaleOpportunity) => Promise<void>
}

export default function WholesaleOpportunityCard({
  opportunity: opp,
  onImportToStore,
  onListOnTakealot,
}: WholesaleOpportunityCardProps) {
  const [importing, setImporting] = useState(false)
  const [listing, setListing] = useState(false)
  const [imported, setImported] = useState(false)
  const [listed, setListed] = useState(false)

  const handleImport = async () => {
    setImporting(true)
    try {
      await onImportToStore(opp)
      setImported(true)
    } finally {
      setImporting(false)
    }
  }

  const handleList = async () => {
    setListing(true)
    try {
      await onListOnTakealot(opp)
      setListed(true)
    } finally {
      setListing(false)
    }
  }

  const marginColor =
    opp.estimatedMargin >= 60
      ? 'text-emerald-600 bg-emerald-50'
      : opp.estimatedMargin >= 40
      ? 'text-amber-600 bg-amber-50'
      : 'text-red-600 bg-red-50'

  const SOURCE_LABELS: Record<string, string> = {
    dhgate: 'DHgate',
    alibaba: 'Alibaba',
    takealot: 'Takealot',
    makro: 'Makro',
    game: 'Game',
    bidorbuy: 'BidOrBuy',
    gumtree: 'Gumtree',
  }

  const sourceBadgeColor = opp.isLocal
    ? 'bg-emerald-100 text-emerald-700'
    : opp.source === 'dhgate'
    ? 'bg-orange-100 text-orange-700'
    : 'bg-blue-100 text-blue-700'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {opp.imageUrl ? (
          <img
            src={opp.imageUrl}
            alt={opp.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => {
              ;(e.target as HTMLImageElement).src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="100" y="100" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Source badge */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-semibold ${sourceBadgeColor}`}>
          {opp.isLocal ? '🇿🇦 ' : ''}{SOURCE_LABELS[opp.source] || opp.source}
        </div>

        {/* Margin badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold ${marginColor}`}
        >
          ~{opp.estimatedMargin}% margin
        </div>

        {/* External link */}
        <a
          href={opp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-lg text-gray-500 hover:text-[#0F172A] transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Product Name */}
        <h3 className="font-medium text-[#0F172A] text-sm leading-snug line-clamp-2">
          {opp.name}
        </h3>

        {/* Pricing */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Supplier cost</span>
            <span className="font-medium text-red-600">
              {formatZAR(opp.costZAR)}
              {!opp.isLocal && opp.costUSD > 0 ? ` ($${opp.costUSD.toFixed(2)})` : ''}
            </span>
          </div>
          {!opp.isLocal && (
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>+ Shipping</span>
              <span>R85</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Suggested sell price</span>
            <span className="font-semibold text-emerald-600">
              {formatZAR(opp.suggestedPrice)}
            </span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-[#F59E0B]" />
            <span className="text-xs font-semibold text-[#0F172A]">
              ~{formatZAR(opp.suggestedPrice - opp.costZAR - (opp.isLocal ? 0 : 85))} profit per unit
            </span>
          </div>
          {opp.deliveryLabel && (
            <div className="flex items-center gap-1 pt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                opp.isLocal ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {opp.deliveryLabel}
              </span>
            </div>
          )}
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
            <Package size={10} />
            Min {opp.minOrder} units
          </span>
          {opp.soldCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
              <ShoppingBag size={10} />
              {opp.soldCount.toLocaleString()} sold
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-xs">
            <Star size={10} className="fill-yellow-400" />
            {opp.rating.toFixed(1)}
          </span>
        </div>

        {/* Supplier info */}
        {(opp.supplierName || opp.supplierCountry) && (
          <p className="text-xs text-gray-400 truncate">
            {opp.supplierName}
            {opp.supplierCountry ? ` · ${opp.supplierCountry}` : ''}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleImport}
            disabled={importing || imported}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
              imported
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-[#0F172A] text-white hover:bg-[#1E293B] disabled:opacity-50'
            }`}
          >
            {importing ? 'Importing...' : imported ? 'Imported ✓' : 'Import to Store'}
          </button>
          <button
            onClick={handleList}
            disabled={listing || listed}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
              listed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default'
                : 'border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B] hover:text-[#0F172A] disabled:opacity-50'
            }`}
          >
            {listing ? 'Listing...' : listed ? 'Listed ✓' : 'List on Takealot'}
          </button>
        </div>
      </div>
    </div>
  )
}
