'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password. Please try again.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link first.')
        } else {
          setError(authError.message)
        }
        return
      }

      router.push('/account')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center group-hover:bg-[#F59E0B] transition-colors">
              <Package className="w-5 h-5 text-[#F59E0B] group-hover:text-[#0F172A] transition-colors" />
            </div>
            <span className="font-bold text-[#0F172A] text-2xl tracking-tight">
              Drop<span className="text-[#F59E0B]">Empire</span>{' '}
              <span className="text-sm font-normal text-gray-500">SA</span>
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-[#0F172A] mt-6">Sign in to your account</h1>
          <p className="text-gray-500 text-sm mt-1">Track orders, manage your profile</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl text-red-700 text-sm mb-6 border border-red-100">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#0F172A] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link
                  href="/account/forgot-password"
                  className="text-xs text-[#F59E0B] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0F172A] text-white rounded-xl font-semibold text-sm hover:bg-[#1E293B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/account/signup" className="text-[#F59E0B] font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
