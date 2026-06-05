'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, jobTotalIncGst } from '@/lib/pricing'
import StatusBadge from '@/components/StatusBadge'

function JoteyMonogram() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Jotey">
      <rect width="48" height="48" rx="10" fill="#22A67A" />
      <text
        x="24"
        y="33"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontWeight="500"
        fontSize="26"
        fill="#FFFFFF"
        textAnchor="middle"
      >
        J
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


function JobRow({ job, hourlyRate, gstRate, getDisplayStatus }) {
  const total = jobTotalIncGst(job, hourlyRate, gstRate)
  const itemCount = (job.items || []).length

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white border border-aq-border rounded-aq-xl p-aq-lg hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-aq-sm mb-1">
        <span className="text-body font-medium text-aq-ink leading-snug">{job.customer_name}</span>
        <StatusBadge status={getDisplayStatus(job)} />
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
  const [bizBannerDismissed, setBizBannerDismissed] = useState(false)
  const [greeting, setGreeting] = useState('')
  useEffect(() => { setGreeting(getGreeting()) }, [])

  const missingBizDetails =
    !settings?.business_name?.trim() ||
    !settings?.business_phone?.trim() ||
    !settings?.business_email?.trim() ||
    !settings?.bank_account_number?.trim()

  function getJobPriority(job) {
    if (job.status === 'accepted' || job.status === 'scheduled') return 0
    if (job.status === 'quoted' || job.status === 'awaiting') return 1
    if (job.status === 'invoiced' && job.payment_status !== 'paid') return 2
    if (job.status === 'draft') return 3
    if (job.status === 'ordered') return 4
    if (job.status === 'completed') return 5
    if (job.status === 'invoiced') return 6
    return 10
  }

  function displayStatus(job) {
    if (job.status === 'invoiced' && job.payment_status !== 'paid') return 'unpaid'
    return job.status
  }

  const recentJobs = [...jobs]
    .filter((j) => j.status !== 'declined')
    .sort((a, b) => {
      const pa = getJobPriority(a)
      const pb = getJobPriority(b)
      if (pa !== pb) return pa - pb
      return new Date(b.created_at) - new Date(a.created_at)
    })
    .slice(0, 5)

  return (
    <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

          {/* Header */}
          <header className="flex items-center gap-aq-md py-aq-xl">
            <JoteyMonogram />
            <div className="flex-1">
              <h1 className="text-page-title font-medium text-aq-ink leading-tight">
                Jotey
              </h1>
              {greeting && <p className="text-secondary text-aq-muted">{greeting}</p>}
            </div>
            <Link
              href="/settings"
              aria-label="Settings"
              className="min-h-tap w-12 flex items-center justify-center text-aq-muted hover:text-aq-ink transition-colors duration-150 shrink-0"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </Link>
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

          {/* Business details nudge */}
          {missingBizDetails && !bizBannerDismissed && (
            <div className="bg-aq-info-tint border border-aq-info-tint-border rounded-aq-xl px-aq-lg py-aq-sm flex items-center justify-between gap-aq-md mb-aq-lg">
              <p className="text-secondary text-aq-info flex-1">
                Finish your business details so they show on your quotes and invoices.{' '}
                <Link href="/settings" className="font-medium underline min-h-tap inline-flex items-center">
                  Go to settings
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setBizBannerDismissed(true)}
                aria-label="Dismiss"
                className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-info shrink-0 text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

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
                    getDisplayStatus={displayStatus}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
    </div>
  )
}
