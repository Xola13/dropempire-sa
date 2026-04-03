'use client'

import { useState } from 'react'
import { formatZAR, formatDateTime, getStatusColor, cn } from '@/lib/utils'
import type { Order } from '@/types'
import { Eye, Package, MoreHorizontal } from 'lucide-react'

interface OrdersTableProps {
  orders: Order[]
  onViewOrder?: (order: Order) => void
}

export default function OrdersTable({
  orders,
  onViewOrder,
}: OrdersTableProps) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Package size={40} className="mx-auto mb-3 opacity-40" />
        <p>No orders yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Order
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Customer
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Total
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Profit
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Status
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">
              Date
            </th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <>
              <tr
                key={order.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() =>
                  setExpandedOrder(
                    expandedOrder === order.id ? null : order.id
                  )
                }
              >
                <td className="py-3 px-4">
                  <div className="font-mono font-semibold text-[#0F172A] text-sm">
                    {order.order_number}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {(order.items as unknown[]).length} item
                    {(order.items as unknown[]).length !== 1 ? 's' : ''}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-800">
                    {order.customer_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {order.customer_email}
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">
                  {formatZAR(order.total)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      'font-semibold',
                      order.total_profit > 0
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    )}
                  >
                    {formatZAR(order.total_profit)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        getStatusColor(order.status)
                      )}
                    >
                      {order.status}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        getStatusColor(order.payment_status)
                      )}
                    >
                      {order.payment_status}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs">
                  {formatDateTime(order.created_at)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {onViewOrder && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          onViewOrder(order)
                        }}
                        className="p-1.5 text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setExpandedOrder(
                          expandedOrder === order.id ? null : order.id
                        )
                      }}
                      className="p-1.5 text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
              {expandedOrder === order.id && (
                <tr key={`${order.id}-expanded`} className="bg-gray-50/50">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700 mb-2">
                          Order Items
                        </p>
                        {(
                          order.items as Array<{
                            name: string
                            qty: number
                            unit_price: number
                          }>
                        ).map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between py-1.5 border-b border-gray-100 last:border-0"
                          >
                            <span className="text-gray-600">
                              {item.name}{' '}
                              <span className="text-gray-400">
                                × {item.qty}
                              </span>
                            </span>
                            <span className="font-medium">
                              {formatZAR(item.unit_price * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 mb-2">
                          Delivery Address
                        </p>
                        <p className="text-gray-600">
                          {order.customer_name}
                          <br />
                          {
                            (
                              order.delivery_address as unknown as Record<
                                string,
                                string
                              >
                            ).address
                          }
                          <br />
                          {
                            (
                              order.delivery_address as unknown as Record<
                                string,
                                string
                              >
                            ).city
                          }
                          ,{' '}
                          {
                            (
                              order.delivery_address as unknown as Record<
                                string,
                                string
                              >
                            ).province
                          }{' '}
                          {
                            (
                              order.delivery_address as unknown as Record<
                                string,
                                string
                              >
                            ).postalCode
                          }
                        </p>
                        {order.tracking_number && (
                          <div className="mt-3">
                            <p className="font-semibold text-gray-700">
                              Tracking
                            </p>
                            <p className="font-mono text-sm text-blue-600">
                              {order.tracking_number}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
