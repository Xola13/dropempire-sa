'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
  Package,
  Loader2,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatZAR, formatDate, getStatusColor } from '@/lib/utils'
import type { Order } from '@/types'

interface CustomerProfile {
  id: string
  name: string
  email: string
  phone?: string
  total_orders: number
  total_spent: number
}

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
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
        const [profileRes, ordersRes] = await Promise.all([
          fetch('/api/account/profile'),
          fetch('/api/account/orders?limit=5'),
        ])

        if (profileRes.ok) {
          const data = await profileRes.json()
          setProfile(data.customer || null)
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json()
          setRecentOrders(data.orders || [])
        }
      } catch {
        // non-fatal
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

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">My Account</h1>

      {/* ---- 1. Profile Card ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#0F172A] rounded-full flex items-center justify-center text-white font-bold text-lg">
              {initials}
            </div>
            <div>
              <h2 className="font-semibold text-[#0F172A] text-lg">
                {profile?.name || 'Customer'}
              </h2>
              <div className="space-y-0.5 mt-1">
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" />
                  {profile?.email}
                </p>
                {profile?.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    {profile.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/account/profile"
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-[#F59E0B] hover:text-[#0F172A] transition-colors"
          >
            <User size={14} />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* ---- 2. Stats ---- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ShoppingBag size={18} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Orders</span>
          </div>
          <p className="text-3xl font-bold text-[#0F172A]">
            {profile?.total_orders ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-[#F59E0B]" />
            </div>
            <span className="text-sm text-gray-500">Total Spent</span>
          </div>
          <p className="text-3xl font-bold text-[#0F172A]">
            {formatZAR(profile?.total_spent ?? 0)}
          </p>
        </div>
      </div>

      {/* ---- 3. Recent Orders ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-[#0F172A]">Recent Orders</h3>
          <Link
            href="/account/orders"
            className="text-sm text-[#F59E0B] font-medium hover:underline flex items-center gap-1"
          >
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">No orders yet</p>
            <Link
              href="/products"
              className="inline-block mt-3 text-sm text-[#F59E0B] hover:underline"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map(order => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#0F172A] text-sm">{order.order_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} ·{' '}
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold text-[#0F172A]">
                    {formatZAR(order.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- 4. Quick Links ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/account/orders"
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-[#F59E0B]/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center group-hover:bg-[#F59E0B] transition-colors">
              <ShoppingBag size={18} className="text-[#F59E0B] group-hover:text-[#0F172A] transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] text-sm">View All Orders</p>
              <p className="text-xs text-gray-400">Full order history</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-[#F59E0B] transition-colors" />
        </Link>

        <Link
          href="/account/track"
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-[#F59E0B]/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center group-hover:bg-[#F59E0B] transition-colors">
              <MapPin size={18} className="text-[#F59E0B] group-hover:text-[#0F172A] transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] text-sm">Track a Package</p>
              <p className="text-xs text-gray-400">Live delivery status</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-[#F59E0B] transition-colors" />
        </Link>
      </div>
    </div>
  )
}
