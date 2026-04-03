'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart2,
  Cpu,
  Settings,
  Truck,
  Package2,
  ExternalLink,
  Download,
  Store,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Products',
    href: '/admin/products',
    icon: Package,
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart2,
  },
  {
    label: 'Import Products',
    href: '/admin/import',
    icon: Download,
  },
  {
    label: 'Price Compare',
    href: '/admin/compare',
    icon: ArrowLeftRight,
  },
  {
    label: 'AI Sourcing',
    href: '/admin/ai-sourcing',
    icon: Cpu,
  },
  {
    label: 'Marketplace',
    href: '/admin/marketplace',
    icon: Store,
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-[#0F172A] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center">
            <Package2 className="w-4 h-4 text-[#0F172A]" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">
              DropEmpire SA
            </p>
            <p className="text-[#F59E0B] text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#F59E0B] text-[#0F172A]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon
                size={18}
                className={isActive ? 'text-[#0F172A]' : ''}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ExternalLink size={16} />
          View Store
        </Link>
        <Link
          href="/admin/orders?status=pending"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Truck size={16} />
          Pending Fulfillment
        </Link>
      </div>
    </aside>
  )
}
