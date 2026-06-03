'use client'

import Link from 'next/link'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, calcGst } from '@/lib/pricing'
import StatusBadge from '@/components/StatusBadge'

function AQMonogram() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Awesome Quote">
      <rect width="48" height="48" rx="10" fill="#22A67A" />
      <text
        x="24"
        y="32"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontWeight="500"
        fontSize="22"
        fill="#FFFFFF"
        textAnchor="middle"
        letterSpacing="-1.5"
      >
        AQ
      </text>
    </svg>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function ActionButton({ href, icon, label }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-aq-lg bg-white border border-aq-border rounded-aq-xl p-aq-lg min-h-[64px] text-body font-medium text-aq-ink hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
    >
      <span className="text-aq-green text-[24px] w-8 flex items-center justify-center shrink-0" aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>
  )
}

function jobTotalIncGst(job, hourlyRate, gstRate) {
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

function JobRow({ job, hourlyRate, gstRate }) {
  const total = jobTotalIncGst(job, hourlyRate, gstRate)
  const itemCount = (job.items || []).length

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white border border-aq-border rounded-aq-xl p-aq-lg hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-aq-sm mb-1">
        <span className="text-body font-medium text-aq-ink leading-snug">{job.customer_name}</span>
        <StatusBadge status={job.status} />
      </div>
      {job.customer_address && (
        <p className="text-secondary text-aq-muted mb-1">{job.customer_address}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-secondary text-aq-muted">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
        <p className="text-body font-medium text-aq-ink">{formatCurrency(total)}</p>
      </div>
    </Link>
  )
}


export default function HomePage() {
  const { jobs } = useJob()
  const { settings } = useSettings()

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  return (
    <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          {/* Header */}
          <header className="flex items-center gap-aq-md py-aq-xl">
            <AQMonogram />
            <div>
              <h1 className="text-page-title font-medium text-aq-ink leading-tight">
                Awesome Quote
              </h1>
              <p className="text-secondary text-aq-muted">{getGreeting()}</p>
            </div>
          </header>

          {/* Primary action buttons */}
          <section aria-label="Main actions">
            <div className="flex flex-col gap-[10px] mb-aq-2xl">
              <ActionButton href="/jobs/new" icon="+" label="New job" />
              <ActionButton
                href="/quotes"
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                label="Open quotes"
              />
              <ActionButton
                href="/today"
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
                label="Jobs today"
              />
              <ActionButton
                href="/catalogue"
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                }
                label="Parts catalogue"
              />
            </div>
          </section>

          {/* Recent jobs */}
          <section aria-label="Recent jobs">
            <h2 className="text-section font-medium text-aq-ink mb-aq-md">Recent jobs</h2>

            {recentJobs.length === 0 ? (
              <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center">
                <p className="text-secondary text-aq-muted">
                  No jobs yet. Tap New job to get started.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {recentJobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    hourlyRate={settings.hourly_labour_rate}
                    gstRate={settings.gst_rate}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
    </div>
  )
}
