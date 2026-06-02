import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import Card from '@/components/Card'

// AQ monogram SVG -- white AQ on go green, 48x48 container
function AQMonogram() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-label="Awesome Quote"
    >
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

// Large home screen action button -- full width, 64px min height, icon + label
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

// Mock recent jobs for placeholder display
const MOCK_JOBS = [
  {
    id: 'mock-1',
    customer_name: 'Sarah Taufa',
    customer_address: '14 Rata St, Papakura',
    summary: 'Sliding door roller replacement',
    status: 'awaiting',
    total: 185.00,
  },
  {
    id: 'mock-2',
    customer_name: 'Mike Henderson',
    customer_address: '3/22 Morrin Rd, Glen Innes',
    summary: 'Window stay and lock fault',
    status: 'accepted',
    total: 320.00,
  },
  {
    id: 'mock-3',
    customer_name: 'Pinnacle Property',
    customer_address: 'Multiple units, Mt Eden',
    summary: 'Bifold door hinges (4 items)',
    status: 'invoiced',
    total: 640.00,
  },
]

function JobRow({ job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white border border-aq-border rounded-aq-xl p-aq-lg hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-aq-sm mb-1">
        <span className="text-body font-medium text-aq-ink leading-snug">
          {job.customer_name}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <p className="text-secondary text-aq-muted mb-1">{job.customer_address}</p>
      <p className="text-secondary text-aq-muted mb-aq-sm">{job.summary}</p>
      <p className="text-body font-medium text-aq-ink">
        ${job.total.toFixed(2)}
      </p>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

        {/* Header */}
        <header className="flex items-center gap-aq-md py-aq-xl">
          <AQMonogram />
          <div>
            <h1 className="text-page-title font-medium text-aq-ink leading-tight">
              Awesome Quote
            </h1>
            <p className="text-secondary text-aq-muted">Good morning</p>
          </div>
        </header>

        {/* Primary action buttons */}
        <section aria-label="Main actions">
          <div className="flex flex-col gap-[10px] mb-aq-2xl">
            <ActionButton
              href="/jobs/new"
              icon="+"
              label="New job"
            />
            <ActionButton
              href="/jobs?status=quoted"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              }
              label="Open quotes"
            />
            <ActionButton
              href="/jobs?filter=today"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              }
              label="Jobs today"
            />
            <ActionButton
              href="/catalogue"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              }
              label="Parts catalogue"
            />
          </div>
        </section>

        {/* Recent jobs */}
        <section aria-label="Recent jobs">
          <h2 className="text-section font-medium text-aq-ink mb-aq-md">
            Recent jobs
          </h2>

          {MOCK_JOBS.length === 0 ? (
            <Card>
              <p className="text-secondary text-aq-muted text-center py-aq-xl">
                No jobs yet. Tap &ldquo;New job&rdquo; to get started.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {MOCK_JOBS.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
