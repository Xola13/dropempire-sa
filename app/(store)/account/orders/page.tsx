'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, ChevronLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatZAR, formatDate, getStatusColor } from '@/lib/utils'
import type { Order } from '@/types'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/account/login')
        return
      }

      try {
        const res = await fetch('/api/account/orders')
        if (res.ok) {
          const data = await res.json()
          setOrders(data.orders || [])
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#F59E0B]" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          className="p-2 rounded-xl text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Order History</h1>
          <p className="text-sm text-gray-500">
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
          <Package size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">Your orders will appear here</p>
          <Link
            href="/products"
            className="inline-block mt-5 px-6 py-3 bg-[#0F172A] text-white rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Order header row */}
              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-[#0F172A]">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}{' '}
                      · Placed {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <span className="font-semibold text-[#0F172A]">
                    {formatZAR(order.total)}
                  </span>
                  <Link
                    href={`/account/track?order=${order.order_number}`}
                    onClick={e => e.stopPropagation()}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-[#F59E0B] hover:text-[#0F172A] transition-colors whitespace-nowrap"
                  >
                    Track
                  </Link>
                  {expandedOrder === order.id ? (
                    <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </button>

              {/* Expanded items */}
              {expandedOrder === order.id && (
                <div className="border-t border-gray-50 px-6 py-4 space-y-3 bg-gray-50/30">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-xl bg-white border border-gray-100"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Package size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F172A]">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Qty: {item.qty}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {formatZAR(item.unit_price * item.qty)}
                      </p>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-500">
                      {order.tracking_number
                        ? `Tracking: ${order.tracking_number}`
                        : 'Tracking will be added when shipped'}
                    </span>
                    <span className="font-bold text-[#0F172A]">
                      Total: {formatZAR(order.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
