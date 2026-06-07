'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import StatusBadge from '@/components/StatusBadge'
import { getPartsCount, updateBusiness } from '@/lib/db'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildNavUrl(address, navApp) {
  const enc = encodeURIComponent(address)
  switch (navApp) {
    case 'apple_maps': return `https://maps.apple.com/?daddr=${enc}`
    case 'waze': return `https://waze.com/ul?q=${enc}&navigate=yes`
    case 'system_default': return `geo:0,0?q=${enc}`
    default: return `https://www.google.com/maps/dir/?api=1&destination=${enc}`
  }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day > 0) return `${day}d ago`
  if (hr > 0) return `${hr}h ago`
  if (min > 0) return `${min}m ago`
  return 'Just now'
}

function activityLabel(status) {
  const labels = {
    draft:     'Quote started',
    quoted:    'Quote sent',
    accepted:  'Quote accepted',
    ordered:   'Parts ordered',
    scheduled: 'Job scheduled',
    completed: 'Job completed',
    invoiced:  'Invoice sent',
    declined:  'Quote declined',
  }
  return labels[status] || 'Updated'
}

function jobSummary(job) {
  const items = job.items || []
  if (!items.length) return ''
  const labels = items.map((it) =>
    it.type === 'diagnosed'
      ? (it.joinery_type_label || it.fault_label || 'Diagnosed item')
      : (it.description || 'Custom item')
  )
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]}, ${labels[1]} +${labels.length - 2} more`
}

// ─── Smart prompt logic ────────────────────────────────────────────────────────

function resolvePrompt(jobs) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const hour = now.getHours()

  // Priority 1: job starting within next hour (or started ≤15 min ago)
  const upcomingJob = jobs.find((j) => {
    if (j.scheduled_date !== today) return false
    if (j.status !== 'accepted' && j.status !== 'scheduled') return false
    if (j.start_minute == null) return false
    return j.start_minute >= nowMin - 15 && j.start_minute <= nowMin + 60
  })
  if (upcomingJob) return { type: 'upcoming', job: upcomingJob }

  // Priority 2: quote just accepted (unscheduled, within last 24 h)
  const recentlyAccepted = [...jobs]
    .filter((j) => {
      if (j.status !== 'accepted') return false
      if (j.schedule_state !== 'unassigned') return false
      const ref = j.accepted_at || j.updated_at
      if (!ref) return false
      return Date.now() - new Date(ref).getTime() < 86400000
    })
    .sort((a, b) =>
      new Date(b.accepted_at || b.updated_at) - new Date(a.accepted_at || a.updated_at)
    )[0]
  if (recentlyAccepted) return { type: 'accepted', job: recentlyAccepted }

  // Priority 3: uninvoiced completed jobs — only in evening or no active jobs today
  const completedJobs = jobs.filter((j) => j.status === 'completed')
  if (completedJobs.length > 0) {
    const activeToday = jobs.some(
      (j) =>
        j.scheduled_date === today &&
        (j.status === 'accepted' || j.status === 'scheduled')
    )
    if (hour >= 17 || !activeToday) {
      return { type: 'uninvoiced', count: completedJobs.length }
    }
  }

  return null
}

// ─── Smart prompt card ─────────────────────────────────────────────────────────

function SmartPromptCard({ prompt }) {
  if (!prompt) return null

  // Upcoming job
  if (prompt.type === 'upcoming') {
    const { job } = prompt
    const summary = jobSummary(job)
    const mapsUrl = job.customer_address
      ? buildNavUrl(job.customer_address, settings.preferred_nav_app)
      : null

    return (
      <div style={{ backgroundColor: '#1F2D37', borderRadius: 12, padding: '16px 16px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#8CA3A0', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Next job
        </p>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px', lineHeight: 1.3 }}>
          {job.customer_name}
        </p>
        {summary && (
          <p style={{ fontSize: 14, color: '#8CA3A0', margin: '0 0 4px', lineHeight: 1.4 }}>
            {summary}
          </p>
        )}
        {job.customer_address && (
          <p style={{ fontSize: 14, color: '#8CA3A0', margin: '0 0 16px', lineHeight: 1.4 }}>
            {job.customer_address}
          </p>
        )}
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingLeft: 24, paddingRight: 24, borderRadius: 10, backgroundColor: '#22A67A', color: '#FFFFFF', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
          >
            Navigate
          </a>
        ) : (
          <Link
            href={`/jobs/${job.id}`}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingLeft: 24, paddingRight: 24, borderRadius: 10, backgroundColor: '#22A67A', color: '#FFFFFF', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
          >
            View job
          </Link>
        )}
      </div>
    )
  }

  // Quote just accepted
  if (prompt.type === 'accepted') {
    const { job } = prompt
    return (
      <div style={{ backgroundColor: '#E6F7F0', border: '1px solid #C5E8D5', borderRadius: 12, padding: '16px 16px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#22A67A', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Quote accepted
        </p>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#1F2D37', margin: '0 0 16px', lineHeight: 1.3 }}>
          {job.customer_name}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href={`/jobs/${job.id}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 10, border: '1px solid #C5E8D5', backgroundColor: '#FFFFFF', color: '#1F2D37', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
          >
            View
          </Link>
          <Link
            href="/planner"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 10, backgroundColor: '#22A67A', color: '#FFFFFF', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
          >
            Schedule
          </Link>
        </div>
      </div>
    )
  }

  // Uninvoiced completed jobs
  if (prompt.type === 'uninvoiced') {
    return (
      <div style={{ backgroundColor: '#FEF7E6', border: '1px solid #F5E2B0', borderRadius: 12, padding: '16px 16px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#854F0B', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Ready to invoice
        </p>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#1F2D37', margin: '0 0 16px', lineHeight: 1.3 }}>
          {prompt.count} {prompt.count === 1 ? 'job' : 'jobs'} ready to invoice
        </p>
        <Link
          href="/quotes"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingLeft: 24, paddingRight: 24, borderRadius: 10, backgroundColor: '#E8940D', color: '#FFFFFF', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
        >
          Invoice now
        </Link>
      </div>
    )
  }

  return null
}

// ─── Day progress bar ──────────────────────────────────────────────────────────

function DayProgressBar({ jobs }) {
  const today = new Date().toISOString().split('T')[0]
  const todaysJobs = jobs.filter((j) => j.scheduled_date === today)
  const done = todaysJobs.filter((j) => j.status === 'completed').length
  const total = todaysJobs.length
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)

  return (
    <Link href="/today" style={{ display: 'block', textDecoration: 'none', marginBottom: 16 }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37' }}>
            {done} of {total} done today
          </span>
          <span style={{ fontSize: 14, color: '#8CA3A0' }}>{pct}%</span>
        </div>
        <div style={{ height: 6, backgroundColor: '#E4EAE8', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#22A67A', borderRadius: 3 }} />
        </div>
      </div>
    </Link>
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, count, sub, href, countColor }) {
  return (
    <Link href={href} style={{ flex: 1, textDecoration: 'none' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: '14px 16px', minHeight: 96, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 14, color: '#4A5B68', margin: 0, lineHeight: 1.3 }}>{label}</p>
        <p style={{ fontSize: 34, fontWeight: 500, color: countColor, margin: 0, lineHeight: 1 }}>{count}</p>
        <p style={{ fontSize: 13, color: '#8CA3A0', margin: 0 }}>{sub}</p>
      </div>
    </Link>
  )
}

// ─── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: '12px 16px', minHeight: 64, textDecoration: 'none' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {job.customer_name}
        </p>
        <p style={{ fontSize: 14, color: '#4A5B68', margin: 0 }}>
          {activityLabel(job.status)}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <StatusBadge status={job.status} />
        <p style={{ fontSize: 13, color: '#8CA3A0', margin: 0 }}>
          {timeAgo(job.updated_at || job.created_at)}
        </p>
      </div>
    </Link>
  )
}

// ─── Onboarding checklist ──────────────────────────────────────────────────────

const QUOTED_STATUSES = new Set(['quoted', 'accepted', 'ordered', 'scheduled', 'completed', 'invoiced'])

function OnboardingChecklist({ settings, jobs, onComplete }) {
  const [partsCount, setPartsCount] = useState(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    getPartsCount().then(setPartsCount)
  }, [])

  if (partsCount === null) return null
  if (settings?.onboarding_complete) return null

  const hasSetup = settings?.setup_complete === true
  const hasParts = partsCount > 0
  const hasJobs = jobs.length > 0
  const hasSentQuote = jobs.some((j) => QUOTED_STATUSES.has(j.status))
  const allDone = hasSetup && hasParts && hasJobs && hasSentQuote

  if (allDone && !completing) {
    setCompleting(true)
    updateBusiness({ onboarding_complete: true }).then(onComplete)
    return null
  }

  const items = [
    { label: 'Set up your business', done: hasSetup, href: '/setup' },
    { label: 'Add your first part', done: hasParts, href: '/catalogue' },
    { label: 'Create your first job', done: hasJobs, href: '/jobs/new' },
    { label: 'Send your first quote', done: hasSentQuote, href: '/quotes' },
  ]

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: '16px 16px 18px', marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: '#4A5B68', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Getting started
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(({ label, done, href }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: done ? '#22A67A' : 'transparent',
              border: done ? 'none' : '2px solid #E4EAE8',
            }}>
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            {done ? (
              <span style={{ fontSize: 14, color: '#8CA3A0', textDecoration: 'line-through' }}>{label}</span>
            ) : (
              <Link href={href} style={{ fontSize: 14, color: '#1F2D37', textDecoration: 'none' }}>{label}</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { jobs } = useJob()
  const { settings, updateSettings } = useSettings()
  const [greeting, setGreeting] = useState('')
  useEffect(() => { setGreeting(getGreeting()) }, [])

  const businessName = settings?.business_name || settings?.trading_name || ''
  const prompt = resolvePrompt(jobs)

  const quotedCount = jobs.filter((j) => j.status === 'quoted').length
  const toScheduleCount = jobs.filter(
    (j) => j.status === 'accepted' && j.schedule_state === 'unassigned'
  ).length

  const recentActivity = [...jobs]
    .filter((j) => j.status !== 'declined')
    .sort((a, b) =>
      new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
    )
    .slice(0, 5)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#F6F8F7' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 88px' }}>

        {/* Greeting */}
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 24, paddingBottom: 20 }}>
          <div>
            {greeting && (
              <p style={{ fontSize: 16, color: '#4A5B68', margin: '0 0 2px' }}>{greeting}</p>
            )}
            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1F2D37', margin: 0, lineHeight: 1.2 }}>
              {businessName || 'Jotey'}
            </h1>
          </div>
          <Link
            href="/settings"
            aria-label="Settings"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48, color: '#8CA3A0', flexShrink: 0 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
        </header>

        {/* Smart prompt — contextual, changes based on priority */}
        <SmartPromptCard prompt={prompt} />

        {/* Day progress — taps to Today view */}
        <DayProgressBar jobs={jobs} />

        {/* New job — full width, always visible, never moves */}
        <Link
          href="/jobs/new"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 56, backgroundColor: '#22A67A', color: '#FFFFFF', borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: 'none', marginBottom: 16, boxSizing: 'border-box' }}
        >
          New job
        </Link>

        {/* Onboarding checklist — shown until all 4 steps complete */}
        <OnboardingChecklist
          settings={settings}
          jobs={jobs}
          onComplete={() => updateSettings({ onboarding_complete: true })}
        />

        {/* Stat cards — live counts */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <StatCard
            label="Quotes out"
            count={quotedCount}
            sub="Waiting on customer"
            href="/quotes"
            countColor="#3B82D6"
          />
          <StatCard
            label="To schedule"
            count={toScheduleCount}
            sub="Accepted, unplanned"
            href="/planner"
            countColor="#1F2D37"
          />
        </div>

        {/* Recent activity — last 5 job status changes */}
        <section aria-label="Recent activity">
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1F2D37', margin: '0 0 12px' }}>
            Recent activity
          </h2>
          {recentActivity.length === 0 ? (
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 16, color: '#8CA3A0', margin: 0 }}>
                No jobs yet. Tap New job to get started.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentActivity.map((job) => (
                <ActivityRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
