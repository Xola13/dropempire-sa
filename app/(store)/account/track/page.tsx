'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  Package,
  CheckCircle2,
  Circle,
  Truck,
  MapPin,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import type { Order } from '@/types'

const TRACKING_STEPS: { key: Order['status']; label: string; desc: string }[] = [
  { key: 'confirmed', label: 'Order Confirmed', desc: 'We received your order' },
  { key: 'processing', label: 'Processing', desc: 'Preparing your items' },
  { key: 'shipped', label: 'Shipped', desc: 'Your order is on the way' },
  { key: 'delivered', label: 'Delivered', desc: 'Package delivered!' },
]

const STATUS_ORDER: Order['status'][] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]

function getStepIndex(status: Order['status']): number {
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

function OrderTrackingCard({ order }: { order: Order }) {
  const currentIdx = getStepIndex(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <p className="font-semibold text-[#0F172A]">{order.order_number}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Ordered {formatDate(order.created_at)} ·{' '}
            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {order.estimated_delivery && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Est. delivery</p>
            <p className="text-sm font-semibold text-[#0F172A]">{order.estimated_delivery}</p>
          </div>
        )}
      </div>

      <div className="px-6 py-6">
        {isCancelled ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package size={20} className="text-red-400" />
            </div>
            <p className="font-medium text-red-600">Order Cancelled</p>
            <p className="text-xs text-gray-400 mt-1">This order has been cancelled</p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="relative mb-6">
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100" />
              <div
                className="absolute top-5 left-5 h-0.5 bg-[#F59E0B] transition-all duration-700"
                style={{
                  width: `${
                    TRACKING_STEPS.length > 1
                      ? Math.max(
                          0,
                          ((Math.min(currentIdx - 1, TRACKING_STEPS.length - 1)) /
                            (TRACKING_STEPS.length - 1)) *
                            100
                        )
                      : 0
                  }%`,
                }}
              />

              <div className="relative flex justify-between">
                {TRACKING_STEPS.map((step, idx) => {
                  const stepIdx = STATUS_ORDER.indexOf(step.key)
                  const isComplete = currentIdx > stepIdx
                  const isCurrent =
                    currentIdx === stepIdx ||
                    (idx === 0 && currentIdx < stepIdx)

                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 w-20">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                          isComplete
                            ? 'bg-[#F59E0B]'
                            : isCurrent
                            ? 'bg-[#0F172A] ring-4 ring-[#0F172A]/10'
                            : 'bg-gray-100'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2
                            size={18}
                            className="text-white fill-white"
                          />
                        ) : isCurrent ? (
                          idx === 2 ? (
                            <Truck size={16} className="text-white" />
                          ) : (
                            <Circle size={16} className="text-white fill-white" />
                          )
                        ) : (
                          <Circle size={16} className="text-gray-300" />
                        )}
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-xs font-medium ${
                            isComplete || isCurrent ? 'text-[#0F172A]' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-400 hidden sm:block">{step.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tracking info */}
            {order.tracking_number && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Truck size={18} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {order.courier || 'Courier'}
                    </p>
                    <p className="text-xs text-blue-600">
                      Tracking: {order.tracking_number}
                    </p>
                  </div>
                </div>
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                  >
                    Track <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {!order.tracking_number && order.status !== 'delivered' && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl text-sm text-amber-700">
                <MapPin size={16} className="flex-shrink-0" />
                Tracking will be added once your order is shipped
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function TrackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderParam = searchParams.get('order')

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

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
        const res = await fetch('/api/account/orders?status=confirmed,processing,shipped,delivered&limit=20')
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

  // Filter to highlighted order if orderParam is set
  const displayOrders = orderParam
    ? orders.filter(o => o.order_number === orderParam)
    : orders.filter(
        o => o.status !== 'delivered' && o.status !== 'cancelled'
      )

  const deliveredOrders = orders.filter(o => o.status === 'delivered')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          className="p-2 rounded-xl text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Track Orders</h1>
          <p className="text-sm text-gray-500">Live status for all your active orders</p>
        </div>
      </div>

      {/* Active orders */}
      {displayOrders.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {orderParam ? 'Order Status' : 'Active Deliveries'}
          </h2>
          {displayOrders.map(order => (
            <OrderTrackingCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
          <Truck size={36} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">
            {orderParam ? 'Order not found' : 'No active deliveries'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {orderParam
              ? 'Check the order number and try again'
              : 'All your orders have been delivered'}
          </p>
          <Link
            href="/account/orders"
            className="inline-block mt-4 text-sm text-[#F59E0B] hover:underline"
          >
            View all orders
          </Link>
        </div>
      )}

      {/* Recently delivered */}
      {!orderParam && deliveredOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Recently Delivered
          </h2>
          {deliveredOrders.slice(0, 3).map(order => (
            <OrderTrackingCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
