'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import BackButton from '@/components/BackButton'
import { useSettings } from '@/lib/settings-context'
import {
  JOB_SOURCE_LABELS,
  JOINERY_TYPE_LABELS,
  FAULT_OPTIONS,
} from '@/lib/constants'
import { formatCurrency, calcGst } from '@/lib/pricing'
import { generateQuotePdf, downloadBlob } from '@/lib/generate-quote-pdf'
import Button from '@/components/Button'
import StatusBadge from '@/components/StatusBadge'
import DurationPresets from '@/components/DurationPresets'
import ConfirmModal from '@/components/ConfirmModal'

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

const TRACKER_STEPS = [
  { key: 'draft',     label: 'Draft' },
  { key: 'quoted',    label: 'Quoted' },
  { key: 'accepted',  label: 'Accepted' },
  { key: 'ordered',   label: 'Ordered' },
  { key: 'completed', label: 'Done' },
]

const STATUS_STEP_INDEX = {
  draft: 0, quoted: 1, awaiting: 1,
  accepted: 2, scheduled: 2, ordered: 3,
  completed: 4, invoiced: 4,
}

function StatusTracker({ status }) {
  const stepIdx = STATUS_STEP_INDEX[status] ?? 0
  return (
    <div className="flex items-start">
      {TRACKER_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-start flex-1">
          <div className="flex flex-col items-center flex-shrink-0 w-full">
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className={`flex-1 h-0.5 ${i <= stepIdx ? 'bg-aq-green' : 'bg-aq-border'}`} />
              )}
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                i <= stepIdx ? 'bg-aq-green border-aq-green' : 'bg-white border-aq-border'
              }`}>
                {i < stepIdx ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i === stepIdx ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : null}
              </div>
              {i < TRACKER_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIdx ? 'bg-aq-green' : 'bg-aq-border'}`} />
              )}
            </div>
            <p className={`text-[11px] mt-1 text-center leading-tight ${
              i <= stepIdx ? 'text-aq-green font-medium' : 'text-aq-muted'
            }`}>
              {step.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function getFaultLabel(joineryType, fault) {
  const opts = FAULT_OPTIONS[joineryType] || []
  return opts.find((o) => o.value === fault)?.label || fault
}

function formatScheduledDateTime(date, time) {
  try {
    const d = new Date(`${date}T${time}`)
    const datePart = d.toLocaleDateString('en-NZ', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    const timePart = d
      .toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })
      .toLowerCase()
    return `${datePart}, ${timePart}`
  } catch {
    return `${date} ${time}`
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { jobs, currentJob, setCurrentJob, selectJob } = useJob()
  const { settings } = useSettings()

  const [backHref, setBackHref] = useState('/')
  const [backLabel, setBackLabel] = useState('Home')
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const from = sp.get('from')
    if (from === 'quotes') { setBackHref('/quotes'); setBackLabel('Quotes') }
    else if (from === 'today') { setBackHref('/today'); setBackLabel('Today') }
  }, [])

  useEffect(() => {
    const match = jobs.find((j) => j.id === params.id)
    if (match) selectJob(params.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const [scheduledDate, setScheduledDate]       = useState(currentJob?.scheduled_date     || '')
  const [scheduledTime, setScheduledTime]       = useState(currentJob?.scheduled_time     || '')
  const [scheduledDuration, setScheduledDuration] = useState(currentJob?.scheduled_duration || 0)
  const [scheduleOpen, setScheduleOpen]         = useState(false)
  const [xeroModalOpen, setXeroModalOpen]       = useState(false)
  const [resendModalOpen, setResendModalOpen]   = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="text-center">
          <p className="text-body text-aq-muted mb-aq-lg">No active job.</p>
          <Button variant="primary" onClick={() => router.push('/')}>Go home</Button>
        </div>
      </div>
    )
  }

  const status = currentJob.status
  const hourlyRate  = currentJob.hourly_rate  || settings.hourly_labour_rate
  const labourHours = currentJob.labour_hours || 0
  const calloutFee  = currentJob.callout_fee  || 0
  const hasItems    = (currentJob.items || []).length > 0

  const partsTotal = (currentJob.items || [])
    .flatMap((i) => i.parts || [])
    .reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourTotal = labourHours * hourlyRate
  const subtotal    = partsTotal + labourTotal + calloutFee
  const gst         = calcGst(subtotal, settings.gst_rate)
  const jobTotal    = subtotal + gst

  const mapsUrl = currentJob.customer_address
    ? `https://maps.google.com/?q=${encodeURIComponent(currentJob.customer_address)}`
    : null

  // Schedule handlers — used in ACCEPTED (inline) and SCHEDULED (edit mode)
  function handleDateChange(val) {
    setScheduledDate(val)
    setCurrentJob((prev) => ({ ...prev, scheduled_date: val }))
  }
  function handleTimeChange(val) {
    setScheduledTime(val)
    setCurrentJob((prev) => ({ ...prev, scheduled_time: val }))
  }
  function handleDurationChange(val) {
    setScheduledDuration(val)
    setCurrentJob((prev) => ({ ...prev, scheduled_duration: val }))
  }
  function handleSaveSchedule() {
    setCurrentJob((prev) => ({
      ...prev,
      status: 'scheduled',
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      scheduled_duration: scheduledDuration,
    }))
    setScheduleOpen(false)
  }

  function handleXeroConfirm() {
    setCurrentJob((prev) => ({ ...prev, status: 'invoiced' }))
    setXeroModalOpen(false)
  }

  function handleCompleteConfirm() {
    setCurrentJob((prev) => ({ ...prev, status: 'completed' }))
    setCompleteModalOpen(false)
    setInvoiceModalOpen(true)
  }

  function handleInvoiceConfirm() {
    setCurrentJob((prev) => ({ ...prev, status: 'invoiced' }))
    setInvoiceModalOpen(false)
  }

  function handleInvoiceLater() {
    setInvoiceModalOpen(false)
  }

  async function handleDownloadPdf() {
    const lh = currentJob.labour_hours || 0
    const cf = currentJob.callout_fee  || 0
    const hr = currentJob.hourly_rate  || settings.hourly_labour_rate
    const pts = (currentJob.items || [])
      .flatMap((i) => i.parts || [])
      .reduce((s, p) => s + p.sell_price * p.qty, 0)
    const sub = pts + lh * hr + cf
    const g   = calcGst(sub, settings.gst_rate)
    try {
      const blob = await generateQuotePdf({
        job: currentJob, settings,
        labourHours: lh, calloutFee: cf, hourlyRate: hr,
        subtotal: sub, gst: g, total: sub + g,
        acceptanceUrl: `https://awesome-quote.vercel.app/accept/${currentJob.id}`,
      })
      const safeName = (currentJob.customer_name || 'quote')
        .replace(/[^a-z0-9]/gi, '-').toLowerCase()
      downloadBlob(blob, `quote-${safeName}.pdf`)
    } catch (err) {
      console.error('PDF download failed:', err)
    }
  }

  // ── Shared blocks ─────────────────────────────────────────────────────────

  // Customer card — withNavigate controls the Navigate button
  const showNavigate = ['accepted', 'ordered', 'scheduled'].includes(status)

  const customerCard = (
    <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
      <div className="flex items-start justify-between gap-aq-sm mb-aq-sm">
        <h2 className="text-section font-medium text-aq-ink leading-snug">
          {currentJob.customer_name}
        </h2>
        <StatusBadge status={status} />
      </div>

      {currentJob.customer_address && mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-aq-xs text-secondary text-aq-green hover:text-aq-green-hover transition-colors mb-aq-xs">
          <MapPinIcon />
          {currentJob.customer_address}
        </a>
      )}

      {currentJob.customer_phone && (
        <a href={`tel:${currentJob.customer_phone}`}
          className="block text-secondary text-aq-green hover:text-aq-green-hover transition-colors mb-aq-xs">
          {currentJob.customer_phone}
        </a>
      )}

      {currentJob.source && (
        <p className="text-caption text-aq-muted mt-aq-xs">
          {JOB_SOURCE_LABELS[currentJob.source] || currentJob.source}
        </p>
      )}

      {showNavigate && mapsUrl && (
        <div className="mt-aq-md">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" fullWidth>Navigate</Button>
          </a>
        </div>
      )}
    </div>
  )

  // Items list rows — reused in both items card (DRAFT) and quote summary card
  const itemRows = (currentJob.items || []).map((item) => {
    const iPartsTotal = (item.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0)
    const partsCount  = (item.parts || []).length
    return (
      <div key={item.id}
        className="flex items-center justify-between gap-aq-sm py-aq-sm border-b border-aq-border last:border-0">
        <div className="flex-1 min-w-0">
          {item.type === 'custom' ? (
            <div className="flex items-center gap-aq-sm">
              <StatusBadge status="custom" label="Custom" />
              {item.description && (
                <p className="text-secondary text-aq-ink truncate">{item.description}</p>
              )}
            </div>
          ) : (
            <p className="text-secondary font-medium text-aq-ink leading-snug truncate">
              {JOINERY_TYPE_LABELS[item.joinery_type] || item.joinery_type}
              {item.fault ? ` - ${getFaultLabel(item.joinery_type, item.fault)}` : ''}
            </p>
          )}
          <p className="text-caption text-aq-muted mt-0.5">
            {partsCount} {partsCount === 1 ? 'part' : 'parts'}
          </p>
        </div>
        <span className="text-secondary font-medium text-aq-ink shrink-0">
          {formatCurrency(iPartsTotal)}
        </span>
      </div>
    )
  })

  // Quote summary card — used in QUOTED, ACCEPTED, SCHEDULED, COMPLETED, INVOICED
  const quoteSummaryCard = (
    <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
      <h2 className="text-section font-medium text-aq-ink mb-aq-md">Quote summary</h2>

      {hasItems ? (
        <div className="mb-aq-md">{itemRows}</div>
      ) : (
        <p className="text-secondary text-aq-muted mb-aq-md">No items.</p>
      )}

      <div className="border-t border-aq-border pt-aq-md flex flex-col gap-aq-xs">
        {labourTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-secondary text-aq-muted">
              Labour ({labourHours} hr at {formatCurrency(hourlyRate)}/hr)
            </span>
            <span className="text-secondary text-aq-muted">{formatCurrency(labourTotal)}</span>
          </div>
        )}
        {calloutFee > 0 && (
          <div className="flex justify-between">
            <span className="text-secondary text-aq-muted">Callout fee</span>
            <span className="text-secondary text-aq-muted">{formatCurrency(calloutFee)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-secondary text-aq-muted">GST ({settings.gst_rate}%)</span>
          <span className="text-secondary text-aq-muted">{formatCurrency(gst)}</span>
        </div>
        <div className="flex justify-between items-baseline mt-aq-sm bg-aq-green-tint border border-aq-green-tint-border rounded-aq-md px-aq-md py-aq-sm">
          <span className="text-body font-medium text-aq-ink">Total (incl. GST)</span>
          <span className="text-section font-medium text-aq-ink">{formatCurrency(jobTotal)}</span>
        </div>
      </div>
    </div>
  )

  // Schedule pickers — used inline in ACCEPTED and as editable block in SCHEDULED
  const schedulePickers = (
    <div className="flex flex-col gap-aq-md">
      <div className="flex gap-aq-sm">
        <div className="flex-1">
          <label htmlFor="sched-date" className="block text-secondary text-aq-muted mb-aq-sm">Date</label>
          <input id="sched-date" type="date" value={scheduledDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-3 text-body text-aq-ink focus:outline-none focus:border-aq-green transition-colors" />
        </div>
        <div className="flex-1">
          <label htmlFor="sched-time" className="block text-secondary text-aq-muted mb-aq-sm">Time</label>
          <input id="sched-time" type="time" value={scheduledTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-3 text-body text-aq-ink focus:outline-none focus:border-aq-green transition-colors" />
        </div>
      </div>
      <div>
        <p className="text-secondary text-aq-muted mb-aq-sm">Duration</p>
        <DurationPresets value={scheduledDuration} onChange={handleDurationChange} />
      </div>
    </div>
  )

  // Status tracker — shown for ACCEPTED and beyond
  const showTracker = ['accepted', 'ordered', 'scheduled', 'completed', 'invoiced'].includes(status)
  const trackerCard = (
    <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
      <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Status</h2>
      <StatusTracker status={status} />
    </div>
  )

  // ── STATUS-SPECIFIC SECTIONS ──────────────────────────────────────────────

  // ── DRAFT ──────────────────────────────────────────────────────────────────
  const draftContent = status === 'draft' && (
    <>
      {/* Items card */}
      <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
        <button type="button"
          onClick={() => router.push(`/jobs/${params.id}/items`)}
          className="flex items-center justify-between w-full mb-aq-md">
          <h2 className="text-section font-medium text-aq-ink">Items</h2>
          <span className="text-aq-muted"><ChevronRightIcon /></span>
        </button>

        {hasItems ? (
          <div className="mb-aq-md">{itemRows}</div>
        ) : (
          <p className="text-secondary text-aq-muted mb-aq-md">No items added yet.</p>
        )}

        {hasItems && (
          <div className="flex justify-between items-baseline pt-aq-sm border-t border-aq-border">
            <span className="text-body font-medium text-aq-ink">Total (incl. GST)</span>
            <span className="text-body font-medium text-aq-ink">{formatCurrency(jobTotal)}</span>
          </div>
        )}
      </div>

      {/* Primary action */}
      <div className="flex flex-col gap-aq-sm">
        {hasItems ? (
          <>
            <Button variant="primary" fullWidth
              onClick={() => router.push(`/jobs/${params.id}/quote`)}>
              Build quote
            </Button>
            <Button variant="secondary" fullWidth
              onClick={() => router.push(`/jobs/${params.id}/items/add`)}>
              Add more items
            </Button>
            <Button variant="secondary" fullWidth
              onClick={() => router.push(`/jobs/${params.id}/items`)}>
              Edit items
            </Button>
          </>
        ) : (
          <Button variant="primary" fullWidth
            onClick={() => router.push(`/jobs/${params.id}/items/add`)}>
            Add items
          </Button>
        )}
      </div>
    </>
  )

  // ── QUOTED ─────────────────────────────────────────────────────────────────
  const quotedContent = status === 'quoted' && (
    <>
      {/* Waiting indicator */}
      <p className="text-secondary text-aq-muted px-aq-xs">
        Quote sent, waiting for response.
      </p>

      {quoteSummaryCard}

      <div className="flex flex-col gap-aq-sm">
        <Button variant="primary" fullWidth onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button variant="secondary" fullWidth
          onClick={() => router.push(`/jobs/${params.id}/quote`)}>
          Edit quote
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setResendModalOpen(true)}>
          Resend quote
        </Button>
      </div>
    </>
  )

  // ── ACCEPTED / ORDERED ────────────────────────────────────────────────────
  const acceptedContent = (status === 'accepted' || status === 'ordered') && (
    <>
      {quoteSummaryCard}

      {/* Next steps */}
      <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
        <h2 className="text-section font-medium text-aq-ink mb-aq-md">Next steps</h2>
        <div className="flex flex-col gap-aq-sm">
          <Button variant="primary" fullWidth onClick={() => setXeroModalOpen(true)}>
            Send to Xero
          </Button>
          <Button variant="secondary" fullWidth
            onClick={() => router.push(`/jobs/${params.id}/order`)}>
            Order parts
          </Button>
          <Button variant="secondary" fullWidth
            onClick={() => setScheduleOpen((o) => !o)}>
            {scheduleOpen ? 'Cancel' : 'Schedule return visit'}
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setCompleteModalOpen(true)}>
            Job completed
          </Button>
        </div>

        {scheduleOpen && (
          <div className="mt-aq-lg border-t border-aq-border pt-aq-lg flex flex-col gap-aq-md">
            {schedulePickers}
            <Button variant="secondary" fullWidth
              disabled={!scheduledDate || !scheduledTime}
              onClick={handleSaveSchedule}>
              Save schedule
            </Button>
          </div>
        )}
      </div>

      {trackerCard}
    </>
  )

  // ── SCHEDULED ─────────────────────────────────────────────────────────────
  const scheduledContent = status === 'scheduled' && (
    <>
      {/* Schedule card */}
      <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
        <div className="flex items-center justify-between mb-aq-md">
          <h2 className="text-section font-medium text-aq-ink">Schedule</h2>
          <button type="button"
            onClick={() => setScheduleOpen((o) => !o)}
            className="text-aq-green text-secondary font-medium min-h-tap px-aq-sm flex items-center">
            {scheduleOpen ? 'Done' : 'Edit'}
          </button>
        </div>

        {!scheduleOpen && scheduledDate && scheduledTime ? (
          <div>
            <p className="text-body text-aq-ink">
              {formatScheduledDateTime(scheduledDate, scheduledTime)}
            </p>
            {scheduledDuration > 0 && (
              <p className="text-secondary text-aq-muted mt-aq-xs">
                {scheduledDuration < 60
                  ? `${scheduledDuration} min`
                  : `${scheduledDuration / 60} hr`}
              </p>
            )}
          </div>
        ) : !scheduleOpen ? (
          <p className="text-secondary text-aq-muted">No schedule set.</p>
        ) : null}

        {scheduleOpen && schedulePickers}
      </div>

      <Button variant="primary" fullWidth onClick={() => setCompleteModalOpen(true)}>
        Job completed
      </Button>

      {quoteSummaryCard}
      {trackerCard}
    </>
  )

  // ── COMPLETED / INVOICED ──────────────────────────────────────────────────
  const completedContent = (status === 'completed' || status === 'invoiced') && (
    <>
      {/* Status banner */}
      <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl px-aq-lg py-aq-md">
        <p className="text-body font-medium text-aq-green text-center">
          {status === 'invoiced' ? 'Invoiced' : 'Job complete'}
        </p>
      </div>

      {quoteSummaryCard}

      <div className="flex flex-col gap-aq-sm">
        {status === 'completed' && (
          <Button variant="primary" fullWidth onClick={() => setXeroModalOpen(true)}>
            Send to Xero
          </Button>
        )}
        <Button variant="secondary" fullWidth onClick={handleDownloadPdf}>
          Download PDF
        </Button>
      </div>

      {trackerCard}
    </>
  )

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton href={backHref} label={backLabel} />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Job detail</h1>
          </div>

          <div className="flex flex-col gap-aq-lg">
            {customerCard}
            {draftContent}
            {quotedContent}
            {acceptedContent}
            {scheduledContent}
            {completedContent}
          </div>

        </div>
      </div>

      <ConfirmModal
        open={xeroModalOpen}
        question={`Send invoice to Xero? This creates a draft invoice for ${formatCurrency(jobTotal)}.`}
        confirmLabel="Yes, send"
        cancelLabel="Not yet"
        onConfirm={handleXeroConfirm}
        onCancel={() => setXeroModalOpen(false)}
      />

      <ConfirmModal
        open={resendModalOpen}
        question={`Download the quote PDF to resend to ${currentJob.customer_name}?`}
        confirmLabel="Yes, download"
        cancelLabel="Not yet"
        onConfirm={async () => { setResendModalOpen(false); await handleDownloadPdf() }}
        onCancel={() => setResendModalOpen(false)}
      />

      <ConfirmModal
        open={completeModalOpen}
        question="Mark this job as completed?"
        confirmLabel="Yes, complete"
        cancelLabel="Not yet"
        onConfirm={handleCompleteConfirm}
        onCancel={() => setCompleteModalOpen(false)}
      />

      <ConfirmModal
        open={invoiceModalOpen}
        question="Send this job to Xero?"
        detail={`This creates a draft invoice for ${formatCurrency(jobTotal)} in Xero.`}
        confirmLabel="Yes, send"
        cancelLabel="Not now"
        onConfirm={handleInvoiceConfirm}
        onCancel={handleInvoiceLater}
      />
    </>
  )
}
