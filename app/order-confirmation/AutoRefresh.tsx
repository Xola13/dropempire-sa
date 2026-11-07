'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// PayFast sends the payment notification a few seconds after the customer returns,
// so the first view often still says "pending". Re-read the order a few times.
export default function AutoRefresh({ intervalMs = 4000, maxRefreshes = 8 }) {
  const router = useRouter()
  useEffect(() => {
    let count = 0
    const id = setInterval(() => {
      count++
      router.refresh()
      if (count >= maxRefreshes) clearInterval(id)
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs, maxRefreshes])
  return null
}
