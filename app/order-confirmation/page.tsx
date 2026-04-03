import Link from 'next/link'
import { CheckCircle, Package, Mail, ArrowRight } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ order_id?: string; m_payment_id?: string }>
}

export default async function OrderConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const orderRef = params.m_payment_id || params.order_id || ''

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-6">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>

        <h1 className="text-3xl font-bold text-[#0F172A] mb-3">
          Order Confirmed!
        </h1>
        <p className="text-gray-600 text-lg mb-2">
          Thank you for your purchase.
        </p>

        {orderRef && (
          <div className="bg-gray-50 rounded-xl px-6 py-4 mb-6 inline-block">
            <p className="text-xs text-gray-500 mb-1">Order Reference</p>
            <p className="font-mono font-bold text-[#0F172A] text-sm">
              {orderRef}
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 text-left space-y-4">
          <div className="flex items-start gap-3">
            <Mail size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">
                Confirmation Email Sent
              </p>
              <p className="text-blue-600 text-xs mt-0.5">
                Check your inbox for order details and tracking updates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Package size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">
                Fulfillment in Progress
              </p>
              <p className="text-blue-600 text-xs mt-0.5">
                Your order is being forwarded to our supplier. Delivery times
                vary by supplier (2–25 days depending on item).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {orderRef && (
            <Link
              href={`/track/${orderRef}`}
              className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white font-bold py-3.5 rounded-xl hover:bg-[#1E293B] transition-colors"
            >
              Track Your Order
              <ArrowRight size={16} />
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
          Questions? Email us at{' '}
          <a
            href="mailto:support@dropempire.co.za"
            className="text-[#F59E0B] hover:underline"
          >
            support@dropempire.co.za
          </a>
        </p>
      </div>
    </div>
  )
}
