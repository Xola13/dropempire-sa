'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!form.email.trim()) {
      setError('Please enter your email')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Create Supabase auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            full_name: form.name.trim(),
            phone: form.phone.trim() || null,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists. Try signing in instead.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (authData.user) {
        // 2. Create/update customer record via API
        await fetch('/api/account/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authUserId: authData.user.id,
            email: form.email.trim().toLowerCase(),
            name: form.name.trim(),
            phone: form.phone.trim() || null,
          }),
        }).catch(() => {
          // Non-fatal: customer record will be created on first order
        })
      }

      // Check if email confirmation is required
      if (authData.session) {
        // Auto-confirmed (dev mode or email confirmations disabled)
        router.push('/account')
        router.refresh()
      } else {
        // Email confirmation required
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm">
            We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your
            account, then sign in.
          </p>
          <Link
            href="/account/login"
            className="inline-block mt-6 px-6 py-3 bg-[#0F172A] text-white rounded-xl font-medium text-sm hover:bg-[#1E293B] transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    )
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
          <h1 className="text-xl font-semibold text-[#0F172A] mt-6">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track orders and manage your deliveries
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl text-red-700 text-sm mb-6 border border-red-100">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Your full name"
                autoComplete="name"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Phone number{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder="+27 82 000 0000"
                autoComplete="tel"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Confirm password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0F172A] text-white rounded-xl font-semibold text-sm hover:bg-[#1E293B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/account/login" className="text-[#F59E0B] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
