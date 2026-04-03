'use client'

import { useEffect, useState } from 'react'
import StatsCards from '@/components/admin/StatsCards'
import OrdersTable from '@/components/admin/OrdersTable'
import { formatZAR } from '@/lib/utils'
import { RefreshCw, Cpu, TrendingUp, AlertTriangle } from 'lucide-react'
import type { Order } from '@/types'

interface DashboardData {
  stats: {
    revenue: number
    profit: number
    orders: number
    activeProducts: number
    revenueChange: number
    profitChange: number
    ordersChange: number
  }
  recentOrders: Order[]
  pendingFulfillment: number
  lowMarginAlerts: number
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        fetch('/api/admin/analytics'),
        fetch('/api/admin/orders?limit=10&sort=created_at'),
      ])

      const analytics = await analyticsRes.json()
      const ordersData = await ordersRes.json()

      setData({
        stats: analytics.stats || {
          revenue: 0,
          profit: 0,
          orders: 0,
          activeProducts: 0,
          revenueChange: 0,
          profitChange: 0,
          ordersChange: 0,
        },
        recentOrders: ordersData.orders || [],
        pendingFulfillment: ordersData.orders?.filter(
          (o: Order) =>
            o.payment_status === 'paid' &&
            o.fulfillment_status === 'unfulfilled'
        ).length || 0,
        lowMarginAlerts: 0,
      })
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            DropEmpire SA — Real-time overview
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Alert Banners */}
      {data && data.pendingFulfillment > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              {data.pendingFulfillment} order
              {data.pendingFulfillment !== 1 ? 's' : ''} awaiting fulfillment
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Payment confirmed — ready to forward to supplier
            </p>
          </div>
          <a
            href="/api/fulfillment/auto-fulfill"
            className="ml-auto px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            Auto-Fulfill Now
          </a>
        </div>
      )}

      {/* Stats */}
      {data && (
        <StatsCards
          revenue={data.stats.revenue}
          profit={data.stats.profit}
          orders={data.stats.orders}
          activeProducts={data.stats.activeProducts}
          revenueChange={data.stats.revenueChange}
          profitChange={data.stats.profitChange}
          ordersChange={data.stats.ordersChange}
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/ai-sourcing"
          className="bg-gradient-to-br from-[#0F172A] to-[#1E3A5F] text-white rounded-xl p-6 hover:shadow-lg transition-shadow group"
        >
          <Cpu size={24} className="text-[#F59E0B] mb-3" />
          <h3 className="font-bold text-lg">AI Sourcing</h3>
          <p className="text-gray-300 text-sm mt-1">
            Find trending products with Claude AI
          </p>
          <div className="mt-4 text-[#F59E0B] text-sm font-medium group-hover:underline">
            Open AI Sourcing →
          </div>
        </a>

        <a
          href="/admin/analytics"
          className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <TrendingUp size={24} className="text-emerald-500 mb-3" />
          <h3 className="font-bold text-lg text-[#0F172A]">Analytics</h3>
          <p className="text-gray-500 text-sm mt-1">
            Revenue, profit & trend charts
          </p>
          <div className="mt-4 text-[#0F172A] text-sm font-medium group-hover:underline">
            View Analytics →
          </div>
        </a>

        <a
          href="/admin/suppliers"
          className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <div className="text-2xl mb-3">📦</div>
          <h3 className="font-bold text-lg text-[#0F172A]">Suppliers</h3>
          <p className="text-gray-500 text-sm mt-1">
            Search AliExpress, CJ & Makro
          </p>
          <div className="mt-4 text-[#0F172A] text-sm font-medium group-hover:underline">
            Browse Suppliers →
          </div>
        </a>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-[#0F172A]">Recent Orders</h2>
          <a
            href="/admin/orders"
            className="text-sm text-[#F59E0B] font-medium hover:underline"
          >
            View all →
          </a>
        </div>
        <OrdersTable orders={data?.recentOrders || []} />
      </div>
    </div>
  )
}
