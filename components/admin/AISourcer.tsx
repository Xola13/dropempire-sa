'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Search,
  TrendingUp,
  Package,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { formatZAR } from '@/lib/utils'
import type { TrendingProduct, SourcingResult } from '@/types'

type WorkflowStep = 'idle' | 'trending' | 'sourcing' | 'importing' | 'done'

export default function AISourcer() {
  const [step, setStep] = useState<WorkflowStep>('idle')
  const [trendKeyword, setTrendKeyword] = useState('')
  const [trendResults, setTrendResults] = useState<TrendingProduct[]>([])
  const [sourcingResult, setSourcingResult] = useState<SourcingResult | null>(
    null
  )
  const [sourcingKeyword, setSourcingKeyword] = useState('')
  const [importedProduct, setImportedProduct] = useState<{
    id: string
    slug: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runTrendScout() {
    setStep('trending')
    setError(null)
    try {
      const res = await fetch('/api/ai/trend-scout', { method: 'POST' })
      const data = await res.json()
      if (data.trends) {
        setTrendResults(data.trends)
        setStep('idle')
      } else {
        throw new Error(data.error || 'Trend scout failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trend scout failed')
      setStep('idle')
    }
  }

  async function runSourcing(keyword: string) {
    setSourcingKeyword(keyword)
    setStep('sourcing')
    setError(null)
    try {
      const res = await fetch('/api/ai/source-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSourcingResult(data)
      setStep('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sourcing failed')
      setStep('idle')
    }
  }

  async function runImport() {
    if (!sourcingResult) return
    setStep('importing')
    setError(null)
    try {
      const res = await fetch('/api/suppliers/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: sourcingResult.bestSupplier,
          productId: sourcingResult.supplierProductId,
          costZAR: sourcingResult.costPrice,
          shippingCostZAR: sourcingResult.shippingCost,
          supplierName: sourcingKeyword,
          imageUrls: [],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setImportedProduct(data.product)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setStep('idle')
    }
  }

  const isLoading =
    step === 'trending' ||
    step === 'sourcing' ||
    step === 'importing'

  return (
    <div className="space-y-6">
      {/* Trend Scout */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">
              Trend Scout Agent
            </h3>
            <p className="text-xs text-gray-500">
              AI analyses current SA market trends
            </p>
          </div>
        </div>

        <button
          onClick={runTrendScout}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-[#0F172A] disabled:text-gray-400 font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          {step === 'trending' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Scanning SA trends...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Find Trending Products
            </>
          )}
        </button>

        {/* Trend Results */}
        <AnimatePresence>
          {trendResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <h4 className="font-semibold text-gray-700 mb-3 text-sm">
                Top {trendResults.length} Trending Opportunities:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {trendResults.map((product, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border border-gray-100 rounded-xl p-4 hover:border-amber-200 hover:bg-amber-50/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0F172A] text-sm line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {product.category}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            product.demandScore >= 80
                              ? 'bg-green-100 text-green-700'
                              : product.demandScore >= 60
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {product.demandScore}/100
                        </div>
                        <span className="text-xs text-emerald-600 font-medium">
                          {product.estimatedMargin}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {product.reasoningNote}
                    </p>

                    <button
                      onClick={() => runSourcing(product.name)}
                      disabled={isLoading}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {step === 'sourcing' &&
                      sourcingKeyword === product.name ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Sourcing...
                        </>
                      ) : (
                        <>
                          <Search size={12} />
                          Source This Product
                        </>
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual Source */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <Search size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">
              Manual Product Sourcing
            </h3>
            <p className="text-xs text-gray-500">
              Search and source any product keyword
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={trendKeyword}
            onChange={e => setTrendKeyword(e.target.value)}
            onKeyDown={e =>
              e.key === 'Enter' &&
              trendKeyword.trim() &&
              runSourcing(trendKeyword)
            }
            placeholder="e.g. solar lantern, massage gun..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50"
          />
          <button
            onClick={() =>
              trendKeyword.trim() && runSourcing(trendKeyword)
            }
            disabled={isLoading || !trendKeyword.trim()}
            className="flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 disabled:bg-gray-200 text-white disabled:text-gray-400 font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            {step === 'sourcing' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Source
          </button>
        </div>
      </div>

      {/* Sourcing Result */}
      <AnimatePresence>
        {sourcingResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Package size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0F172A]">
                  Sourcing Result
                </h3>
                <p className="text-xs text-gray-500">
                  Best option for &quot;{sourcingKeyword}&quot;
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-lg font-bold text-emerald-600">
                  Score: {sourcingResult.score}/100
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Supplier</p>
                <p className="font-bold text-[#0F172A] capitalize mt-0.5">
                  {sourcingResult.bestSupplier}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Cost Price</p>
                <p className="font-bold text-[#0F172A] mt-0.5">
                  {formatZAR(sourcingResult.costPrice)}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Sell Price</p>
                <p className="font-bold text-emerald-700 mt-0.5">
                  {formatZAR(sourcingResult.recommendedPrice)}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Margin</p>
                <p className="font-bold text-amber-700 mt-0.5">
                  {sourcingResult.marginPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg p-3">
              {sourcingResult.reasoning}
            </p>

            {sourcingResult.riskFlags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {sourcingResult.riskFlags.map((flag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full"
                  >
                    <AlertTriangle size={10} />
                    {flag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={sourcingResult.supplierProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View on Supplier
                <ExternalLink size={14} />
              </a>

              <button
                onClick={runImport}
                disabled={step === 'importing'}
                className="flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-600 disabled:bg-gray-200 text-[#0F172A] disabled:text-gray-400 font-bold px-6 py-2.5 rounded-xl transition-colors ml-auto"
              >
                {step === 'importing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing with AI...
                  </>
                ) : (
                  <>
                    Import Product
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Success */}
      <AnimatePresence>
        {step === 'done' && importedProduct && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-center gap-4"
          >
            <CheckCircle size={32} className="text-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-emerald-800">
                Product Imported Successfully!
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                AI-generated listing saved as draft. Review and publish from
                Products.
              </p>
            </div>
            <a
              href={`/admin/products`}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-4 py-2 rounded-lg transition-colors"
            >
              Go to Products
              <ArrowRight size={14} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600 text-sm"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
