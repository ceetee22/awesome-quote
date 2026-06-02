'use client'

import Link from 'next/link'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, calcGst } from '@/lib/pricing'
import StatusBadge from '@/components/StatusBadge'

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

function JobCard({ job, hourlyRate, gstRate }) {
  const itemCount = (job.items || []).length
  const total = jobTotal(job, hourlyRate, gstRate)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white border border-aq-border rounded-aq-xl p-aq-lg hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-aq-sm mb-aq-xs">
        <span className="text-body font-medium text-aq-ink leading-snug">{job.customer_name}</span>
        <StatusBadge status={job.status} />
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

  const openQuotes = [...jobs]
    .filter((j) => j.status === 'quoted' || j.status === 'draft' || j.status === 'awaiting')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <Link
            href="/"
            className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-green -ml-3"
            aria-label="Go home"
          >
            <BackArrow />
          </Link>
          <h1 className="text-page-title font-medium text-aq-ink">Open quotes</h1>
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
