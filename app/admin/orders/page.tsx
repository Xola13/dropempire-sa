'use client'

import { useEffect, useState, useCallback } from 'react'
import OrdersTable from '@/components/admin/OrdersTable'
import type { Order } from '@/types'
import { RefreshCw, Search, Filter, Zap } from 'lucide-react'

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
type PaymentFilter = 'all' | 'paid' | 'pending' | 'failed' | 'refunded'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [total, setTotal] = useState(0)
  const [fulfilling, setFulfilling] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (paymentFilter !== 'all') params.set('payment_status', paymentFilter)
      params.set('limit', '50')

      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, paymentFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleAutoFulfill = async () => {
    setFulfilling(true)
    try {
      const res = await fetch('/api/fulfillment/auto-fulfill', {
        method: 'POST',
      })
      const data = await res.json()
      alert(`Fulfillment run complete. ${data.fulfilled || 0} orders processed.`)
      fetchOrders()
    } catch {
      alert('Fulfillment run failed. Check server logs.')
    } finally {
      setFulfilling(false)
    }
  }

  const pendingCount = orders.filter(
    o => o.payment_status === 'paid' && o.fulfillment_status === 'unfulfilled'
  ).length

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{total} orders total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="p-2 text-gray-500 hover:text-[#0F172A] hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          {pendingCount > 0 && (
            <button
              onClick={handleAutoFulfill}
              disabled={fulfilling}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <Zap size={14} />
              {fulfilling
                ? 'Fulfilling...'
                : `Auto-Fulfill ${pendingCount} Orders`}
            </button>
          )}
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
            placeholder="Search by order number or customer..."
            className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value as PaymentFilter)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
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
          <OrdersTable orders={orders} />
        )}
      </div>
    </div>
  )
}
