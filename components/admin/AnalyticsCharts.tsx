'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import { formatZAR } from '@/lib/utils'
import type { AnalyticsDaily } from '@/types'
import { format, parseISO } from 'date-fns'

interface AnalyticsChartsProps {
  data: AnalyticsDaily[]
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ color: string; name: string; value: number }>
  label?: string
}) => {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-semibold">
            {entry.name === 'Orders'
              ? entry.value
              : formatZAR(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const chartData = data.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    Revenue: d.revenue,
    Profit: d.profit,
    Cost: d.cost,
    Orders: d.orders,
    margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
  }))

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalProfit = data.reduce((s, d) => s + d.profit, 0)
  const totalOrders = data.reduce((s, d) => s + d.orders, 0)
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatZAR(totalRevenue), color: 'text-emerald-600' },
          { label: 'Total Profit', value: formatZAR(totalProfit), color: 'text-amber-600' },
          { label: 'Total Orders', value: totalOrders.toString(), color: 'text-blue-600' },
          { label: 'Avg Margin', value: `${avgMargin.toFixed(1)}%`, color: avgMargin >= 20 ? 'text-emerald-600' : 'text-red-500' },
        ].map(tile => (
          <div key={tile.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium">{tile.label}</p>
            <p className={`text-xl font-bold mt-1 ${tile.color}`}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue & Profit Chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="font-semibold text-[#0F172A] mb-4">
          Revenue vs Profit
        </h3>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `R${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
              />
              <Area
                type="monotone"
                dataKey="Revenue"
                stroke="#0F172A"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="Profit"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#colorProfit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders Chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="font-semibold text-[#0F172A] mb-4">Daily Orders</h3>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Orders" fill="#0F172A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Margin trend */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="font-semibold text-[#0F172A] mb-4">Margin % Trend</h3>
        {chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v.toFixed(0)}%`}
                domain={[0, 60]}
              />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Margin']}
              />
              {/* 20% minimum threshold line */}
              <Line
                type="monotone"
                dataKey={() => 20}
                stroke="#EF4444"
                strokeDasharray="4 4"
                strokeWidth={1}
                dot={false}
                name="Min Margin (20%)"
              />
              <Line
                type="monotone"
                dataKey="margin"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10B981' }}
                name="Actual Margin"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
