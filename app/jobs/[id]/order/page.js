'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/Button'

function BackArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}

export default function OrderPage() {
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-green -ml-3"
            aria-label="Go back"
          >
            <BackArrow />
          </button>
          <h1 className="text-page-title font-medium text-aq-ink">Order parts</h1>
        </div>

        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center">
          <p className="text-body text-aq-muted">Order review coming in v1.1</p>
        </div>
      </div>
    </div>
  )
}
