'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package2, Lock, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/admin')
      } else {
        setError('Invalid password. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F59E0B] rounded-2xl mb-4">
            <Package2 className="w-8 h-8 text-[#0F172A]" />
          </div>
          <h1 className="text-2xl font-bold text-white">DropEmpire SA</h1>
          <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0F172A]/5 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#0F172A]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#0F172A]">Sign in to Admin</h2>
              <p className="text-xs text-gray-500">Enter your admin password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#0F172A] text-white rounded-xl py-3 font-semibold text-sm hover:bg-[#1E293B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          DropEmpire SA Admin — Restricted Access
        </p>
      </div>
    </div>
  )
}
