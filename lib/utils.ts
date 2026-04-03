import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function generateOrderNumber(): string {
  const num = Math.floor(10000 + Math.random() * 90000)
  return `ORD-${num}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDeliveryLabel(supplier: string): string {
  switch (supplier) {
    case 'makro':
      return '2-4 business days'
    case 'cj':
      return '7-15 business days'
    case 'aliexpress':
      return '15-25 business days'
    default:
      return '7-21 business days'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
    case 'delivered':
    case 'fulfilled':
      return 'bg-green-100 text-green-800'
    case 'confirmed':
    case 'processing':
    case 'fulfilling':
      return 'bg-blue-100 text-blue-800'
    case 'shipped':
      return 'bg-purple-100 text-purple-800'
    case 'pending':
    case 'unfulfilled':
      return 'bg-yellow-100 text-yellow-800'
    case 'failed':
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'refunded':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export async function logAgentAction(params: {
  agent: string
  action: string
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  reasoning?: string
  success: boolean
  error?: string
  duration_ms: number
}): Promise<void> {
  try {
    // Dynamic import to avoid circular deps on non-server contexts
    const { supabaseAdmin } = await import('@/lib/supabase')
    await supabaseAdmin.from('agent_logs').insert({
      agent: params.agent,
      action: params.action,
      input: params.input,
      output: params.output,
      reasoning: params.reasoning ?? null,
      success: params.success,
      error: params.error ?? null,
      duration_ms: params.duration_ms,
    })
  } catch {
    // Logging should never throw and crash the main flow
    console.warn('[agent-log] failed to write log')
  }
}
