'use client'

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Percent } from 'lucide-react'
import { formatZAR } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface StatCard {
  title: string
  value: string
  change?: number
  icon: React.ComponentType<{ className?: string; size?: number }>
  color: string
  bgColor: string
}

interface StatsCardsProps {
  revenue: number
  profit: number
  orders: number
  activeProducts: number
  revenueChange?: number
  profitChange?: number
  ordersChange?: number
}

export default function StatsCards({
  revenue,
  profit,
  orders,
  activeProducts,
  revenueChange = 0,
  profitChange = 0,
  ordersChange = 0,
}: StatsCardsProps) {
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0

  const cards: StatCard[] = [
    {
      title: 'Revenue Today',
      value: formatZAR(revenue),
      change: revenueChange,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Profit Today',
      value: formatZAR(profit),
      change: profitChange,
      icon: Percent,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Orders Today',
      value: orders.toString(),
      change: ordersChange,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Products',
      value: activeProducts.toString(),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map(card => (
        <div
          key={card.title}
          className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1">
                {card.value}
              </p>
            </div>
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                card.bgColor
              )}
            >
              <card.icon size={20} className={card.color} />
            </div>
          </div>

          {card.change !== undefined && (
            <div className="flex items-center gap-1.5 mt-3">
              {card.change >= 0 ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : (
                <TrendingDown size={14} className="text-red-500" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  card.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                )}
              >
                {Math.abs(card.change).toFixed(1)}% vs yesterday
              </span>
            </div>
          )}

          {card.title === 'Profit Today' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Margin</span>
                <span>{marginPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    marginPercent >= 30
                      ? 'bg-emerald-500'
                      : marginPercent >= 20
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(marginPercent, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
