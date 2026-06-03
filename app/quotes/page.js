'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, calcGst } from '@/lib/pricing'
import StatusBadge from '@/components/StatusBadge'
import BackButton from '@/components/BackButton'

function jobTotal(job, hourlyRate, gstRate) {
  const parts = (job.items || [])
    .flatMap((i) => i.parts || [])
    .reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labour = (job.items || []).reduce(
    (s, i) => s + (i.labour_hours || 0) * (job.hourly_rate || hourlyRate),
    0
  )
  const subtotal = parts + labour + (job.callout_fee || 0)
  return subtotal + calcGst(subtotal, gstRate)
}

function displayStatus(job) {
  if (job.status === 'invoiced' && job.payment_status !== 'paid') return 'unpaid'
  return job.status
}

function getQuotePriority(job) {
  if (job.status === 'invoiced' && job.payment_status !== 'paid') return 1
  if (job.status === 'quoted' || job.status === 'awaiting') return 2
  if (job.status === 'draft') return 3
  if (job.status === 'declined') return 10
  return 5
}

function JobCard({ job, hourlyRate, gstRate }) {
  const itemCount = (job.items || []).length
  const total = jobTotal(job, hourlyRate, gstRate)

  return (
    <Link
      href={`/jobs/${job.id}?from=quotes`}
      className="block bg-white border border-aq-border rounded-aq-xl p-aq-lg hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-aq-sm mb-aq-xs">
        <span className="text-body font-medium text-aq-ink leading-snug">{job.customer_name}</span>
        <StatusBadge status={displayStatus(job)} />
      </div>
      {job.customer_address && (
        <p className="text-secondary text-aq-muted mb-aq-xs">{job.customer_address}</p>
      )}
      <div className="flex items-center justify-between mt-aq-sm">
        <p className="text-secondary text-aq-muted">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
        <p className="text-body font-medium text-aq-ink">{formatCurrency(total)}</p>
      </div>
    </Link>
  )
}

export default function QuotesPage() {
  const { jobs } = useJob()
  const { settings } = useSettings()
  const [showDeclined, setShowDeclined] = useState(false)

  const openQuotes = [...jobs]
    .filter((j) => {
      if (j.status === 'declined') return showDeclined
      if (j.status === 'invoiced') return j.payment_status !== 'paid'
      return j.status === 'quoted' || j.status === 'draft' || j.status === 'awaiting'
    })
    .sort((a, b) => {
      const pa = getQuotePriority(a)
      const pb = getQuotePriority(b)
      if (pa !== pb) return pa - pb
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const declinedCount = jobs.filter((j) => j.status === 'declined').length

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/" label="Home" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm flex-1">Open quotes</h1>
          {declinedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDeclined((o) => !o)}
              className="text-secondary text-aq-muted hover:text-aq-ink transition-colors min-h-tap px-aq-sm flex items-center shrink-0"
            >
              {showDeclined ? 'Hide declined' : `Show declined (${declinedCount})`}
            </button>
          )}
        </div>

        {openQuotes.length === 0 ? (
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center">
            <p className="text-body text-aq-muted">
              No open quotes. Tap New job to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {openQuotes.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                hourlyRate={settings.hourly_labour_rate}
                gstRate={settings.gst_rate}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
