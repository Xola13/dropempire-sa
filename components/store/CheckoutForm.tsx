'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { formatZAR } from '@/lib/utils'
import { CreditCard, Truck, Shield, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type PaymentMethod = 'payfast' | 'yoco'

interface CheckoutFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  address: string
  city: string
  province: string
  postalCode: string
  paymentMethod: PaymentMethod
}

const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Free State',
  'Northern Cape',
]

export default function CheckoutForm() {
  const { items, total, clearCart } = useCartStore()
  const [form, setForm] = useState<CheckoutFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    paymentMethod: 'payfast',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cartTotal = total()
  const shipping = cartTotal >= 1000 ? 0 : 99
  const grandTotal = cartTotal + shipping

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          deliveryAddress: {
            address: form.address,
            city: form.city,
            province: form.province,
            postalCode: form.postalCode,
          },
          items: items.map(i => ({ productId: i.id, qty: i.qty })),
          paymentMethod: form.paymentMethod,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      if (form.paymentMethod === 'payfast' && data.payfast) {
        // Auto-submit to PayFast
        const payfastForm = document.createElement('form')
        payfastForm.method = 'POST'
        payfastForm.action = data.payfast.action
        Object.entries(data.payfast.params).forEach(([key, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = value as string
          payfastForm.appendChild(input)
        })
        document.body.appendChild(payfastForm)
        clearCart()
        payfastForm.submit()
      } else if (form.paymentMethod === 'yoco' && data.yoco) {
        // Yoco SDK checkout
        clearCart()
        window.location.href = data.yoco.redirectUrl || '/order-confirmation'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Link
          href="/products"
          className="text-[#F59E0B] font-medium hover:underline"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#0F172A] text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Cart
        </Link>
        <h1 className="text-2xl font-bold text-[#0F172A] mt-3">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-[#0F172A] mb-4">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    required
                    placeholder="John Smith"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={form.customerEmail}
                    onChange={handleChange}
                    required
                    placeholder="john@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={form.customerPhone}
                    onChange={handleChange}
                    required
                    placeholder="+27 82 123 4567"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <Truck size={18} className="text-[#F59E0B]" />
                Delivery Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    placeholder="123 Main Street, Apt 4B"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    placeholder="Johannesburg"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Province *
                  </label>
                  <select
                    name="province"
                    value={form.province}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  >
                    <option value="">Select province</option>
                    {SA_PROVINCES.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    required
                    placeholder="2000"
                    pattern="[0-9]{4}"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-[#F59E0B]" />
                Payment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                    form.paymentMethod === 'payfast'
                      ? 'border-[#F59E0B] bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="payfast"
                    checked={form.paymentMethod === 'payfast'}
                    onChange={handleChange}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-semibold text-[#0F172A] text-sm">
                      PayFast
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Credit card, EFT, instant payment
                    </p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                    form.paymentMethod === 'yoco'
                      ? 'border-[#F59E0B] bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="yoco"
                    checked={form.paymentMethod === 'yoco'}
                    onChange={handleChange}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-semibold text-[#0F172A] text-sm">
                      Yoco
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Debit & credit card payment
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
              <h2 className="font-bold text-[#0F172A] mb-4">Order Summary</h2>

              <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 line-clamp-1 flex-1">
                      {item.name}{' '}
                      <span className="text-gray-400">×{item.qty}</span>
                    </span>
                    <span className="font-medium ml-2">
                      {formatZAR(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatZAR(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-medium">FREE</span>
                    ) : (
                      formatZAR(shipping)
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[#0F172A] text-lg pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatZAR(grandTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-[#F59E0B] text-[#0F172A] font-bold py-3.5 rounded-xl hover:bg-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Pay {formatZAR(grandTotal)} Securely
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                You&apos;ll be redirected to{' '}
                {form.paymentMethod === 'payfast' ? 'PayFast' : 'Yoco'} to
                complete payment
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
