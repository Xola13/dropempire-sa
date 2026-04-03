'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { formatZAR } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, ArrowRight, Lock, Loader2 } from 'lucide-react'

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
]

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const cartTotal = total()
  const shipping = cartTotal > 1000 ? 0 : 99

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    city: '',
    province: 'Gauteng',
    postalCode: '',
    paymentMethod: 'payfast' as 'payfast' | 'yoco',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [payfastData, setPayfastData] = useState<{
    action: string
    params: Record<string, string>
  } | null>(null)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.customerName.trim() || form.customerName.length < 2) {
      newErrors.customerName = 'Full name is required'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      newErrors.customerEmail = 'Valid email is required'
    }
    if (!form.customerPhone || form.customerPhone.length < 9) {
      newErrors.customerPhone = 'Valid phone number required'
    }
    if (!form.address.trim()) newErrors.address = 'Address is required'
    if (!form.city.trim()) newErrors.city = 'City is required'
    if (!form.postalCode || form.postalCode.length < 4) {
      newErrors.postalCode = 'Valid postal code required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (items.length === 0) return

    setLoading(true)
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
        setPayfastData(data.payfast)
        // Submit payfast form programmatically after state updates
        setTimeout(() => {
          const form = document.getElementById('payfast-form') as HTMLFormElement
          form?.submit()
        }, 100)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout failed'
      setErrors({ submit: msg })
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
        <h1 className="text-xl font-bold text-[#0F172A]">
          Your cart is empty
        </h1>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 mt-6 bg-[#F59E0B] text-[#0F172A] font-bold px-6 py-3 rounded-xl"
        >
          Shop Now
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hidden PayFast form */}
      {payfastData && (
        <form
          id="payfast-form"
          action={payfastData.action}
          method="POST"
          className="hidden"
        >
          {Object.entries(payfastData.params).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}

      <h1 className="text-2xl font-bold text-[#0F172A] mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-3 space-y-6"
        >
          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-4">
              Contact Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e =>
                    setForm(f => ({ ...f, customerName: e.target.value }))
                  }
                  placeholder="John Smith"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    errors.customerName
                      ? 'border-red-400'
                      : 'border-gray-200'
                  }`}
                />
                {errors.customerName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.customerName}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        customerEmail: e.target.value,
                      }))
                    }
                    placeholder="john@example.com"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.customerEmail
                        ? 'border-red-400'
                        : 'border-gray-200'
                    }`}
                  />
                  {errors.customerEmail && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.customerEmail}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        customerPhone: e.target.value,
                      }))
                    }
                    placeholder="072 000 0000"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.customerPhone
                        ? 'border-red-400'
                        : 'border-gray-200'
                    }`}
                  />
                  {errors.customerPhone && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.customerPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-4">
              Delivery Address
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e =>
                    setForm(f => ({ ...f, address: e.target.value }))
                  }
                  placeholder="123 Main Road, Suburb"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    errors.address ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.address && (
                  <p className="text-xs text-red-500 mt-1">{errors.address}</p>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e =>
                      setForm(f => ({ ...f, city: e.target.value }))
                    }
                    placeholder="Johannesburg"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.city ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.city && (
                    <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                  )}
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <select
                    value={form.province}
                    onChange={e =>
                      setForm(f => ({ ...f, province: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                  >
                    {SA_PROVINCES.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={e =>
                      setForm(f => ({ ...f, postalCode: e.target.value }))
                    }
                    placeholder="2000"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      errors.postalCode ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.postalCode && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.postalCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-4">
              Payment Method
            </h2>
            <div className="space-y-3">
              <label
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                  form.paymentMethod === 'payfast'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="payfast"
                  checked={form.paymentMethod === 'payfast'}
                  onChange={() =>
                    setForm(f => ({ ...f, paymentMethod: 'payfast' }))
                  }
                  className="accent-amber-500"
                />
                <div>
                  <p className="font-semibold text-sm text-gray-800">
                    PayFast
                  </p>
                  <p className="text-xs text-gray-500">
                    Credit/Debit card, EFT, Instant EFT, SnapScan
                  </p>
                </div>
                <div className="ml-auto bg-[#0F172A] text-white text-xs font-bold px-2 py-1 rounded">
                  PAYFAST
                </div>
              </label>

              <label
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                  form.paymentMethod === 'yoco'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="yoco"
                  checked={form.paymentMethod === 'yoco'}
                  onChange={() =>
                    setForm(f => ({ ...f, paymentMethod: 'yoco' }))
                  }
                  className="accent-amber-500"
                />
                <div>
                  <p className="font-semibold text-sm text-gray-800">Yoco</p>
                  <p className="text-xs text-gray-500">
                    Card payment — fast and secure
                  </p>
                </div>
                <div className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                  YOCO
                </div>
              </label>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {errors.submit}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-amber-600 disabled:bg-gray-300 text-[#0F172A] disabled:text-gray-400 font-bold py-4 rounded-xl transition-colors text-lg active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock size={18} />
                Pay {formatZAR(cartTotal + shipping)} Securely
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
            <h2 className="font-semibold text-[#0F172A] mb-4">
              Order Summary
            </h2>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3"
                >
                  <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                    <span className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {item.qty}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {item.name}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                    {formatZAR(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <hr className="border-gray-100 my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatZAR(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span
                  className={
                    shipping === 0 ? 'text-green-600 font-medium' : ''
                  }
                >
                  {shipping === 0 ? 'FREE' : formatZAR(shipping)}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between font-bold text-[#0F172A] text-base">
                <span>Total</span>
                <span>{formatZAR(cartTotal + shipping)}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <Lock size={12} />
              Secured by PayFast — South Africa&apos;s trusted payment gateway
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
