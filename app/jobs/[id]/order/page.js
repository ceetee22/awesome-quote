'use client'

import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton onClick={() => router.push(`/jobs/${params.id}`)} label="Job detail" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Order parts</h1>
        </div>

        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center">
          <p className="text-body text-aq-muted">Order review coming in v1.1</p>
        </div>
      </div>
    </div>
  )
}
