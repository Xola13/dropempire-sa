'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface CustomerProfile {
  id: string
  name: string
  email: string
  phone?: string
  delivery_address?: {
    address?: string
    city?: string
    province?: string
    postalCode?: string
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Profile form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Address form
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        const res = await fetch('/api/account/profile')
        if (res.ok) {
          const data = await res.json()
          const c = data.customer
          setProfile(c)
          setName(c?.name || '')
          setPhone(c?.phone || '')
          setAddress(c?.delivery_address?.address || '')
          setCity(c?.delivery_address?.city || '')
          setProvince(c?.delivery_address?.province || '')
          setPostalCode(c?.delivery_address?.postalCode || '')
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setSuccess('')
    } else {
      setSuccess(msg)
      setError('')
    }
    setTimeout(() => {
      setError('')
      setSuccess('')
    }, 4000)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showFeedback('Name cannot be empty', true)
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          delivery_address: {
            address: address.trim(),
            city: city.trim(),
            province: province.trim(),
            postalCode: postalCode.trim(),
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Update failed')
      }

      showFeedback('Profile updated successfully')
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to update profile', true)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      showFeedback('New password must be at least 8 characters', true)
      return
    }
    if (newPassword !== confirmPassword) {
      showFeedback('Passwords do not match', true)
      return
    }

    setSavingPassword(true)
    try {
      const supabase = createClient()

      // Re-authenticate first
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user?.email) throw new Error('Not authenticated')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      })

      if (signInError) {
        throw new Error('Current password is incorrect')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw new Error(updateError.message)

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showFeedback('Password changed successfully')
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Password change failed', true)
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/account/profile', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete account')

      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace('/')
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Failed to delete account', true)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const SA_PROVINCES = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
    'Western Cape',
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#F59E0B]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          className="p-2 rounded-xl text-gray-400 hover:text-[#0F172A] hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-[#0F172A]">Profile Settings</h1>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl text-emerald-700 text-sm border border-emerald-100">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-700 text-sm border border-red-100">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ---- Profile Info ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-[#0F172A] mb-5">Personal Information</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
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
              value={profile?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+27 82 000 0000"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
            />
          </div>

          <hr className="border-gray-100" />

          <h3 className="font-medium text-[#0F172A] text-sm">Default Delivery Address</h3>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Street address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main Street"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Cape Town"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Postal code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                placeholder="8001"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Province</label>
            <select
              value={province}
              onChange={e => setProvince(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] bg-white"
            >
              <option value="">Select province</option>
              {SA_PROVINCES.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#0F172A] text-white rounded-xl font-semibold text-sm hover:bg-[#1E293B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* ---- Change Password ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-[#0F172A] mb-5">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Current password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
              New password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Confirm new password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="w-full py-3 bg-[#0F172A] text-white rounded-xl font-semibold text-sm hover:bg-[#1E293B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {savingPassword && <Loader2 size={15} className="animate-spin" />}
            {savingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* ---- Danger Zone ---- */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Deleting your account is permanent. Your order history will be retained for legal
          purposes.
        </p>

        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-600">
              Are you absolutely sure? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Yes, Delete My Account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
            Delete Account
          </button>
        )}
      </div>
    </div>
  )
}
