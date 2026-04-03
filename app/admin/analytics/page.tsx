'use client'

import { useEffect, useState } from 'react'
import AnalyticsCharts from '@/components/admin/AnalyticsCharts'
import type { AnalyticsDaily } from '@/types'
import { RefreshCw, Calendar } from 'lucide-react'

type Range = '7d' | '30d' | '90d'

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsDaily[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('30d')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`)
      const json = await res.json()
      setData(json.daily || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Revenue, profit & performance trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['7d', '30d', '90d'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  range === r
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 text-gray-500 hover:text-[#0F172A] hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Note on data freshness */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Calendar size={14} className="text-blue-500" />
        Analytics are updated daily via cron job at midnight. Real-time data may differ slightly.
      </div>

      {/* Charts */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-72 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      ) : (
        <AnalyticsCharts data={data} />
      )}
    </div>
  )
}
