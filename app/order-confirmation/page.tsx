import Link from 'next/link'
import { z } from 'zod'
import { CheckCircle, Clock, XCircle, Package, Mail, ArrowRight } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import AutoRefresh from './AutoRefresh'

export const metadata = { title: 'Order status', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ order_id?: string; m_payment_id?: string }>
}

type View = 'paid' | 'confirming' | 'failed' | 'unknown'

const uuid = z.string().uuid()

// The order id is a random UUID (unguessable), and only the order number and
// payment state are shown, never personal details. The page reports what the
// database says, not what the URL claims: a customer who cancelled on PayFast also
// lands here.
async function loadOrder(ref: string): Promise<{ orderNumber: string; view: View } | null> {
  const parsed = uuid.safeParse(ref)
  if (!parsed.success) return null

  const { data } = await supabaseAdmin
    .from('orders')
    .select('order_number, payment_status')
    .eq('id', parsed.data)
    .maybeSingle()
  if (!data) return null

  const view: View =
    data.payment_status === 'paid'
      ? 'paid'
      : data.payment_status === 'failed' || data.payment_status === 'refunded'
        ? 'failed'
        : 'confirming'
  return { orderNumber: data.order_number, view }
}

export default async function OrderConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const ref = params.m_payment_id || params.order_id || ''
  const order = await loadOrder(ref)
  const view: View = order?.view ?? 'unknown'

  const heading = {
    paid: 'Order Confirmed!',
    confirming: 'Confirming your payment…',
    failed: 'Payment did not go through',
    unknown: "We couldn't find that order",
  }[view]

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        {view === 'confirming' && <AutoRefresh />}

        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
            view === 'paid' ? 'bg-emerald-100' : view === 'confirming' ? 'bg-amber-100' : 'bg-red-100'
          }`}
        >
          {view === 'paid' && <CheckCircle size={40} className="text-emerald-500" />}
          {view === 'confirming' && <Clock size={40} className="text-amber-500" />}
          {(view === 'failed' || view === 'unknown') && <XCircle size={40} className="text-red-500" />}
        </div>

        <h1 className="text-3xl font-bold text-[#0F172A] mb-3">{heading}</h1>

        {view === 'paid' && <p className="text-gray-600 text-lg mb-2">Thank you for your purchase.</p>}
        {view === 'confirming' && (
          <p className="text-gray-600 mb-2">
            We are waiting for your payment provider to confirm. This page updates by itself and
            usually takes a few seconds. Please don&apos;t pay again.
          </p>
        )}
        {view === 'failed' && (
          <p className="text-gray-600 mb-2">
            No money was taken for this order, or it has been refunded. You can try again.
          </p>
        )}
        {view === 'unknown' && (
          <p className="text-gray-600 mb-2">
            If you just paid, check your email for a confirmation or contact us with your payment
            reference.
          </p>
        )}

        {order && (
          <div className="bg-gray-50 rounded-xl px-6 py-4 mb-6 inline-block">
            <p className="text-xs text-gray-500 mb-1">Order Number</p>
            <p className="font-mono font-bold text-[#0F172A] text-sm">{order.orderNumber}</p>
          </div>
        )}

        {view === 'paid' && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800 text-sm">Confirmation email</p>
                <p className="text-blue-600 text-xs mt-0.5">
                  We&apos;ll email your order details to the address you gave at checkout. Check your
                  spam folder if it doesn&apos;t arrive within a few minutes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800 text-sm">What happens next</p>
                <p className="text-blue-600 text-xs mt-0.5">
                  We order your items from our suppliers and email you a tracking number once they
                  ship. Delivery times vary by product.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {view === 'paid' && order && (
            <Link
              href={`/track/${ref}`}
              className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white font-bold py-3.5 rounded-xl hover:bg-[#1E293B] transition-colors"
            >
              Track Your Order
              <ArrowRight size={16} />
            </Link>
          )}
          {view === 'failed' && (
            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white font-bold py-3.5 rounded-xl hover:bg-[#1E293B] transition-colors"
            >
              Back to checkout
            </Link>
          )}
          <Link
            href="/products"
            className="w-full flex items-center justify-center gap-2 bg-[#F59E0B] text-[#0F172A] font-bold py-3.5 rounded-xl hover:bg-[#D97706] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Questions?{' '}
          <Link href="/contact" className="text-[#F59E0B] hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  )
}
