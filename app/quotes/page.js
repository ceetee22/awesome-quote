'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, jobTotalIncGst } from '@/lib/pricing'
import BackButton from '@/components/BackButton'

// ── Helpers ───────────────────────────────────────────────────────────────────

function ageInDays(job) {
  const ref = new Date(job.updated_at || job.created_at)
  return Math.floor((Date.now() - ref.getTime()) / 86400000)
}

function agingBorder(job) {
  if (job.status === 'draft') return '#8CA3A0'
  const d = ageInDays(job)
  if (d <= 3) return '#22A67A'
  if (d <= 7) return '#E8940D'
  return '#D94444'
}

function agingTimeColor(job) {
  if (job.status === 'draft') return '#8CA3A0'
  const d = ageInDays(job)
  if (d <= 3) return '#8CA3A0'
  if (d <= 7) return '#E8940D'
  return '#D94444'
}

function timeContext(job) {
  const isDraft = job.status === 'draft'
  const prefix = isDraft ? 'Started' : 'Sent'
  const d = ageInDays(job)
  if (d === 0) return `${prefix} today`
  if (d === 1) return `${prefix} yesterday`
  return `${prefix} ${d} days ago`
}

function jobDescription(job) {
  const items = job.items || []
  if (items.length === 0) return 'No items added'
  if (items.length === 1) {
    const item = items[0]
    if (item.type === 'diagnosed') {
      return [item.joinery_type_label, item.fault_label].filter(Boolean).join(', ')
    }
    const desc = item.description || 'Custom item'
    return desc.length > 40 ? desc.slice(0, 40) + '...' : desc
  }
  const labels = items.slice(0, 2).map((item) =>
    item.type === 'diagnosed'
      ? (item.joinery_type_label || 'Item')
      : (item.description || 'Custom').slice(0, 20)
  )
  return `${items.length} items: ${labels.join(', ')}`
}

function StatusPill({ status }) {
  const isAwaiting = status === 'quoted' || status === 'awaiting'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
      background: isAwaiting ? '#E8940D' : '#E4EAE8',
      color: isAwaiting ? '#FFFFFF' : '#4A5B68',
      letterSpacing: '0.02em', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {isAwaiting ? 'Awaiting' : 'Draft'}
    </span>
  )
}

// ── Quote card ────────────────────────────────────────────────────────────────

function QuoteCard({ job, hourlyRate, gstRate }) {
  const router = useRouter()
  const { selectJob } = useJob()
  const total = jobTotalIncGst(job, hourlyRate, gstRate)
  const days = ageInDays(job)
  const showNudge = (job.status === 'quoted' || job.status === 'awaiting') && days > 7
  const nudgeText = days >= 14
    ? `No response in ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}`
    : 'Going cold'

  function handleCardClick() {
    selectJob(job.id)
    router.push(`/jobs/${job.id}?from=quotes`)
  }

  function handleResend(e) {
    e.stopPropagation()
    selectJob(job.id)
    router.push(`/jobs/${job.id}/quote`)
  }

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4EAE8',
        borderLeft: `3px solid ${agingBorder(job)}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {/* Row 1: name + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2D37', lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.customer_name || 'Unnamed customer'}
        </span>
        <StatusPill status={job.status} />
      </div>

      {/* Row 2: job description */}
      <p style={{ fontSize: 14, color: '#4A5B68', margin: '0 0 10px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {jobDescription(job)}
      </p>

      {/* Row 3: time + price */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, color: agingTimeColor(job), lineHeight: 1 }}>
          {timeContext(job)}
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2D37', flexShrink: 0 }}>
          {formatCurrency(total)}
        </span>
      </div>

      {/* Follow-up nudge bar */}
      {showNudge && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 10,
            background: '#FEF7E6',
            border: '1px solid #F5E2B0',
            borderRadius: 6,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: '#854F0B', flex: 1, minWidth: 0 }}>
            {nudgeText}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {job.customer_phone && (
              <a
                href={`tel:${job.customer_phone}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 5,
                  background: '#22A67A', color: '#FFFFFF', textDecoration: 'none',
                  border: '1.5px solid #22A67A', borderBottom: '3px solid #147A5A',
                  display: 'inline-flex', alignItems: 'center', minHeight: 30, lineHeight: 1,
                }}
              >
                Call
              </a>
            )}
            <button
              type="button"
              onClick={handleResend}
              style={{
                fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 5,
                background: '#FFFFFF', color: '#4A5B68',
                border: '1.5px solid #E4EAE8', borderBottom: '3px solid #D0D8D4',
                minHeight: 30, cursor: 'pointer', lineHeight: 1,
              }}
            >
              Resend
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#8CA3A0', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#E4EAE8' }} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuotesPage() {
  const { jobs } = useJob()
  const { settings } = useSettings()
  const [filter, setFilter] = useState('all')
  const [showDeclined, setShowDeclined] = useState(false)

  const hourlyRate = settings?.hourly_labour_rate || 95
  const gstRate    = settings?.gst_rate || 15

  const draftCount    = jobs.filter((j) => j.status === 'draft').length
  const awaitingCount = jobs.filter((j) => j.status === 'quoted' || j.status === 'awaiting').length
  const declinedCount = jobs.filter((j) => j.status === 'declined').length
  const allCount      = draftCount + awaitingCount

  const pipelineTotal = jobs
    .filter((j) => j.status === 'quoted' || j.status === 'awaiting')
    .reduce((s, j) => s + jobTotalIncGst(j, hourlyRate, gstRate), 0)

  const showDraftsSection   = filter === 'all' || filter === 'drafts'
  const showAwaitingSection = filter === 'all' || filter === 'awaiting'
  const showDeclinedSection = filter === 'declined' || showDeclined

  const drafts = showDraftsSection
    ? jobs.filter((j) => j.status === 'draft').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : []

  const awaiting = showAwaitingSection
    ? jobs
        .filter((j) => j.status === 'quoted' || j.status === 'awaiting')
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    : []

  const declined = showDeclinedSection
    ? jobs.filter((j) => j.status === 'declined').sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    : []

  const totalVisible = drafts.length + awaiting.length

  const PILLS = [
    { key: 'all',      label: 'All',      count: allCount      },
    { key: 'awaiting', label: 'Awaiting', count: awaitingCount },
    { key: 'drafts',   label: 'Drafts',   count: draftCount    },
    { key: 'declined', label: 'Declined', count: declinedCount },
  ]

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto pb-[88px]">

        {/* Page header */}
        <div style={{ padding: '24px 16px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BackButton href="/" label="Home" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Open quotes</h1>
        </div>

        {/* Pipeline total bar */}
        <div style={{
          background: '#1F2D37',
          margin: '0 16px 16px',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 600, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
              {formatCurrency(pipelineTotal)}
            </p>
            <p style={{ fontSize: 13, color: '#8CA3A0', margin: '3px 0 0' }}>in open quotes</p>
          </div>
          <p style={{ fontSize: 13, color: '#8CA3A0', flexShrink: 0, margin: 0 }}>
            {awaitingCount} {awaitingCount === 1 ? 'quote' : 'quotes'} out
          </p>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {PILLS.map((pill) => {
            const active = filter === pill.key
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilter(pill.key)}
                style={{
                  flexShrink: 0,
                  minHeight: 40,
                  padding: '0 16px',
                  borderRadius: 20,
                  border: `1.5px solid ${active ? '#22A67A' : '#E4EAE8'}`,
                  background: active ? '#22A67A' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#4A5B68',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 150ms, border-color 150ms, color 150ms',
                }}
              >
                {pill.label} <span style={{ fontWeight: 700 }}>{pill.count}</span>
              </button>
            )
          })}
        </div>

        <div style={{ padding: '0 16px' }}>

          {/* Empty state */}
          {totalVisible === 0 && filter !== 'declined' && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 16, color: '#8CA3A0', margin: 0 }}>
                {filter === 'drafts'
                  ? 'No drafts in progress.'
                  : filter === 'awaiting'
                  ? 'No quotes sent yet.'
                  : 'No open quotes. Tap New job to get started.'}
              </p>
            </div>
          )}

          {/* Finish these — drafts */}
          {drafts.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Finish these" />
              {drafts.map((job) => (
                <QuoteCard key={job.id} job={job} hourlyRate={hourlyRate} gstRate={gstRate} />
              ))}
            </div>
          )}

          {/* Waiting on customer — quoted/awaiting */}
          {awaiting.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Waiting on customer" />
              {awaiting.map((job) => (
                <QuoteCard key={job.id} job={job} hourlyRate={hourlyRate} gstRate={gstRate} />
              ))}
            </div>
          )}

          {/* Declined cards */}
          {showDeclinedSection && declined.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Declined" />
              {declined.map((job) => (
                <div
                  key={job.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4EAE8',
                    borderLeft: '3px solid #E4EAE8',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    opacity: 0.65,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#4A5B68', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.customer_name || 'Unnamed customer'}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#8CA3A0', margin: '0 0 8px' }}>{jobDescription(job)}</p>
                  <span style={{ fontSize: 13, color: '#8CA3A0' }}>{timeContext(job)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Show/hide declined toggle */}
          {declinedCount > 0 && filter !== 'declined' && (
            <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowDeclined((v) => !v)}
                style={{
                  fontSize: 14, color: '#8CA3A0', background: 'none', border: 'none',
                  cursor: 'pointer', minHeight: 48, display: 'inline-flex', alignItems: 'center',
                }}
              >
                {showDeclined ? 'Hide declined' : `Show declined (${declinedCount})`}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
