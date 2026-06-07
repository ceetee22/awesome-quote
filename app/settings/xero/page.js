'use client'

import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import Button from '@/components/Button'

export default function XeroPage() {
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Xero</h1>
        </div>

        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg flex flex-col gap-aq-md">
          <h2 className="text-section font-medium text-aq-ink">Xero connection</h2>
          <p className="text-secondary text-aq-muted">
            Link your Xero account to send invoices directly from Jotey.
          </p>
          <p className="text-secondary text-aq-muted">Not connected</p>
          <Button variant="secondary" fullWidth disabled>
            Connect to Xero
          </Button>
          <p className="text-caption text-aq-muted text-center">Xero integration coming soon.</p>
        </div>

      </div>
    </div>
  )
}
