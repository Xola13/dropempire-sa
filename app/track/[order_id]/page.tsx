'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Package,
  CheckCircle,
  Truck,
  MapPin,
  Clock,
  ExternalLink,
  AlertCircle,
  Search,
} from 'lucide-react'
import { formatZAR, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface TrackingData {
  order: {
    order_number: string
    status: string
    payment_status: string
    fulfillment_status: string
    total: number
    tracking_number: string | null
    tracking_url: string | null
    courier: string | null
    estimated_delivery: string | null
    created_at: string
    customer_name: string
    items: Array<{
      name: string
      qty: number
      unit_price: number
    }>
  } | null
  events?: Array<{
    timestamp: string
    location: string
    description: string
  }>
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Payment Confirmed', icon: CheckCircle },
  { key: 'processing', label: 'Order Processing', icon: Clock },
  { key: 'shipped', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
]

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export default function TrackOrderPage() {
  const params = useParams()
  const orderId = params.order_id as string
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [manualId, setManualId] = useState('')

  const fetchTracking = async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/track?order_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Order not found')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchTracking(orderId)
    } else {
      setLoading(false)
    }
  }, [orderId])

  const currentStatusIndex = data?.order
    ? statusOrder.indexOf(data.order.status)
    : -1

  return (
    <div className="min-h-[70vh] max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Track Your Order</h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter your order number or reference to track your delivery
        </p>
      </div>

      {/* Manual search */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={manualId}
          onChange={e => setManualId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && manualId && fetchTracking(manualId)}
          placeholder="Enter order number (e.g. ORD-123456)"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
        />
        <button
          onClick={() => manualId && fetchTracking(manualId)}
          className="px-5 py-3 bg-[#0F172A] text-white rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-colors flex items-center gap-2"
        >
          <Search size={14} />
          Track
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading order...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Order Not Found</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <p className="text-red-500 text-xs mt-2">
              Check your email for the correct order reference number
            </p>
          </div>
        </div>
      )}

      {data?.order && !loading && (
        <div className="space-y-6">
          {/* Order Header */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Order Number</p>
                <p className="font-mono font-bold text-[#0F172A] text-lg">
                  {data.order.order_number}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Placed on {formatDateTime(data.order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Total</p>
                <p className="font-bold text-[#0F172A] text-lg">
                  {formatZAR(data.order.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-bold text-[#0F172A] mb-6">Delivery Status</h2>
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100" />
              <div
                className="absolute top-5 left-5 h-0.5 bg-[#F59E0B] transition-all duration-500"
                style={{
                  width:
                    currentStatusIndex >= 0
                      ? `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%`
                      : '0%',
                }}
              />

              <div className="relative flex justify-between">
                {statusSteps.map((step, i) => {
                  const isComplete = i <= currentStatusIndex
                  const isCurrent = i === currentStatusIndex
                  const Icon = step.icon

                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isComplete
                            ? 'bg-[#F59E0B] border-[#F59E0B]'
                            : 'bg-white border-gray-200'
                        } ${isCurrent ? 'ring-4 ring-amber-100' : ''}`}
                      >
                        <Icon
                          size={16}
                          className={isComplete ? 'text-[#0F172A]' : 'text-gray-300'}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium text-center max-w-16 ${
                          isComplete ? 'text-[#0F172A]' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tracking Info */}
          {data.order.tracking_number && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                    <Truck size={16} />
                    Tracking Number
                  </p>
                  <p className="font-mono font-bold text-blue-900 text-sm">
                    {data.order.tracking_number}
                  </p>
                  {data.order.courier && (
                    <p className="text-xs text-blue-600 mt-1">
                      via {data.order.courier}
                    </p>
                  )}
                  {data.order.estimated_delivery && (
                    <p className="text-xs text-blue-600 mt-1">
                      Estimated delivery:{' '}
                      <span className="font-semibold">
                        {data.order.estimated_delivery}
                      </span>
                    </p>
                  )}
                </div>
                {data.order.tracking_url && (
                  <a
                    href={data.order.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                  >
                    Track Live
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-bold text-[#0F172A] mb-4">Items Ordered</h2>
            <div className="space-y-3">
              {data.order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package size={14} className="text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">
                      {item.name}
                    </span>
                    <span className="text-xs text-gray-400">×{item.qty}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatZAR(item.unit_price * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/products"
              className="text-[#F59E0B] font-medium text-sm hover:underline"
            >
              Continue Shopping →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
