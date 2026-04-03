'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User,
  ShoppingBag,
  MapPin,
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function AccountMenu() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    setOpen(false)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-gray-300" />
      </div>
    )
  }

  // Logged out — show Sign In button
  if (!user) {
    return (
      <Link
        href="/account/login"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-[#0F172A] hover:bg-gray-100 transition-colors"
      >
        <User size={18} />
        <span className="hidden sm:inline">Sign In</span>
      </Link>
    )
  }

  // Logged in — show avatar with dropdown
  const displayName = user.user_metadata?.full_name || user.email || ''
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || '?'

  const shortName = displayName.split(' ')[0] || 'Account'

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition-colors group"
        aria-expanded={open}
      >
        <div className="w-8 h-8 bg-[#0F172A] rounded-full flex items-center justify-center text-[#F59E0B] text-xs font-bold group-hover:bg-[#F59E0B] group-hover:text-[#0F172A] transition-colors">
          {signingOut ? <Loader2 size={14} className="animate-spin" /> : initials}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[80px] truncate">
          {shortName}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
          {/* User info header */}
          <div className="px-4 py-2.5 border-b border-gray-50">
            <p className="text-xs font-semibold text-[#0F172A] truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0F172A] transition-colors"
            >
              <User size={16} className="text-gray-400" />
              My Account
            </Link>

            <Link
              href="/account/orders"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0F172A] transition-colors"
            >
              <ShoppingBag size={16} className="text-gray-400" />
              My Orders
            </Link>

            <Link
              href="/account/track"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0F172A] transition-colors"
            >
              <MapPin size={16} className="text-gray-400" />
              Track Package
            </Link>

            <Link
              href="/account/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#0F172A] transition-colors"
            >
              <Settings size={16} className="text-gray-400" />
              Profile Settings
            </Link>
          </div>

          <div className="border-t border-gray-50 py-1">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
