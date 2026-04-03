'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, RefreshCw, Shield, Bell, Database } from 'lucide-react'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [syncingPrices, setSyncingPrices] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleSignOut = async () => {
    setSigningOut(true)
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const handleSyncPrices = async () => {
    setSyncingPrices(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/cron/sync-prices', { method: 'GET' })
      const data = await res.json()
      setSyncResult(data.message || `Synced ${data.synced || 0} products`)
    } catch {
      setSyncResult('Sync failed. Check server logs.')
    } finally {
      setSyncingPrices(false)
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            System configuration and maintenance
          </p>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-[#0F172A]" />
          <h2 className="font-semibold text-[#0F172A]">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="font-medium text-gray-800 text-sm">Admin Password</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Set via ADMIN_SECRET environment variable
              </p>
            </div>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
              Configured
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-800 text-sm">Admin Session</p>
              <p className="text-xs text-gray-500 mt-0.5">
                7-day session, httpOnly cookie
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <LogOut size={14} />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>

      {/* Data Sync */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-[#0F172A]" />
          <h2 className="font-semibold text-[#0F172A]">Data Management</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="font-medium text-gray-800 text-sm">
                Sync Supplier Prices
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Refresh costs from AliExpress, CJ & Makro. Auto-runs daily.
              </p>
            </div>
            <button
              onClick={handleSyncPrices}
              disabled={syncingPrices}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={syncingPrices ? 'animate-spin' : ''}
              />
              {syncingPrices ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {syncResult && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-sm text-emerald-700">
              {syncResult}
            </div>
          )}

          <div className="flex items-start justify-between py-3">
            <div>
              <p className="font-medium text-gray-800 text-sm">Cron Jobs</p>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <p>• Price sync: Daily at 02:00 SAST</p>
                <p>• Order check: Every 4 hours</p>
                <p>• Trend scout: Weekly on Monday</p>
                <p>• Daily report: Daily at 08:00 SAST</p>
              </div>
            </div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
              via vercel.json
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-[#0F172A]" />
          <h2 className="font-semibold text-[#0F172A]">Notifications</h2>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Email notifications are sent via Resend. Configure your email
            address in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code> file:
          </p>
          <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-xs space-y-1">
            <p>RESEND_API_KEY=re_xxx</p>
            <p>ADMIN_EMAIL=your@email.com</p>
            <p>FROM_EMAIL=orders@dropempire.co.za</p>
          </div>
          <p className="text-xs text-gray-500">
            Daily reports and order confirmations are sent automatically.
          </p>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="bg-[#0F172A] rounded-xl p-6">
        <h2 className="font-semibold text-white mb-3">
          Required Environment Variables
        </h2>
        <div className="font-mono text-xs text-gray-300 space-y-1.5">
          {[
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'ANTHROPIC_API_KEY',
            'RESEND_API_KEY',
            'ADMIN_SECRET',
            'ADMIN_EMAIL',
            'FROM_EMAIL',
            'NEXT_PUBLIC_SITE_URL',
            'PAYFAST_MERCHANT_ID',
            'PAYFAST_MERCHANT_KEY',
            'PAYFAST_PASSPHRASE',
            'NEXT_PUBLIC_PAYFAST_SANDBOX',
            'YOCO_SECRET_KEY',
            'NEXT_PUBLIC_EXCHANGE_RATE_USD_ZAR',
          ].map(key => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[#F59E0B]">{key}</span>
              <span className="text-gray-600">=</span>
              <span className="text-gray-500">...</span>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-4">
          Copy <code className="bg-white/10 px-1 rounded">.env.example</code> to{' '}
          <code className="bg-white/10 px-1 rounded">.env.local</code> and fill
          in all values.
        </p>
      </div>
    </div>
  )
}
