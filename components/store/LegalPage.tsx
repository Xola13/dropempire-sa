import type { ReactNode } from 'react'

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-gray-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-[#0F172A]">{title}</h1>
      <div className="mt-8 space-y-8">{children}</div>
    </main>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-[#0F172A] mb-2">{title}</h2>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  )
}

/** A visible placeholder for something only the shop owner can supply. Never ship one of these. */
export function Todo({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 text-sm">
      <strong>To be completed by the shop owner before launch:</strong> {children}
    </p>
  )
}

/** Renders a seller detail, or a Todo marker when it has not been configured. */
export function Detail({ label, value, envVar }: { label: string; value: string | null; envVar: string }) {
  return value ? (
    <p>
      <span className="font-medium">{label}:</span> {value}
    </p>
  ) : (
    <Todo>
      {label} (set {envVar})
    </Todo>
  )
}
