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
import { uploadPhoto } from '@/lib/upload-photo'
import Button from '@/components/Button'
import StatusBadge from '@/components/StatusBadge'
import DurationPresets from '@/components/DurationPresets'
import ConfirmModal from '@/components/ConfirmModal'
import PhotoCapture from '@/components/PhotoCapture'

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
    const d = new Date(`${date}T${time || '00:00'}`)
    const datePart = d.toLocaleDateString('en-NZ', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    if (!time) return datePart
    const timePart = d
      .toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })
      .toLowerCase()
    return `${datePart}, ${timePart}`
  } catch {
    return `${date} ${time || ''}`
  }
}

function formatPaidDate(isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return ''
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

  const [scheduledDate, setScheduledDate]         = useState(currentJob?.scheduled_date     || '')
  const [scheduledTime, setScheduledTime]         = useState(currentJob?.scheduled_time     || '')
  const [scheduledDuration, setScheduledDuration] = useState(currentJob?.scheduled_duration || 0)
  const [scheduleOpen, setScheduleOpen]           = useState(false)
  const [rescheduleMsg, setRescheduleMsg]         = useState('')

  const [afterPhotos, setAfterPhotos] = useState(currentJob?.after_photos || [])

  function handleAfterPhotosChange(photos) {
    setAfterPhotos(photos)
    setCurrentJob((prev) => ({ ...prev, after_photos: photos }))
  }

  const allBeforePhotos = (currentJob?.items || []).flatMap((item) => (item.photos || []).filter((p) => p.type === 'before'))

  async function handleDownloadPhotos() {
    const photos = [
      ...allBeforePhotos.map((p, i) => ({ url: p.url, filename: `before-${i + 1}.jpg` })),
      ...(currentJob?.after_photos || []).map((p, i) => ({ url: p.url, filename: `after-${i + 1}.jpg` })),
    ]
    for (const photo of photos) {
      try {
        const res = await fetch(photo.url)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = photo.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        await new Promise((r) => setTimeout(r, 150))
      } catch { /* skip failed downloads */ }
    }
  }

  const [xeroModalOpen, setXeroModalOpen]         = useState(false)
  const [resendModalOpen, setResendModalOpen]     = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen]   = useState(false)
  const [declineModalOpen, setDeclineModalOpen]   = useState(false)
  const [payModalOpen, setPayModalOpen]           = useState(false)
  const [unpayModalOpen, setUnpayModalOpen]       = useState(false)

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

  const status      = currentJob.status
  const hourlyRate  = currentJob.hourly_rate  || settings.hourly_labour_rate
  const labourHours = currentJob.labour_hours || 0
  const calloutFee  = currentJob.callout_fee  || 0
  const hasItems    = (currentJob.items || []).length > 0

  const partsTotal  = (currentJob.items || [])
    .flatMap((i) => i.parts || [])
    .reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourTotal = labourHours * hourlyRate
  const subtotal    = partsTotal + labourTotal + calloutFee
  const gst         = calcGst(subtotal, settings.gst_rate)
  const jobTotal    = subtotal + gst

  const partsGrossCost = (currentJob.items || [])
    .flatMap((i) => i.parts || [])
    .reduce((s, p) => s + (p.cost_price || 0) * p.qty, 0)
  const profit       = subtotal - partsGrossCost
  const profitMargin = subtotal > 0 ? profit / subtotal : 0

  const mapsUrl = currentJob.customer_address
    ? `https://maps.google.com/?q=${encodeURIComponent(currentJob.customer_address)}`
    : null

  // ── Handlers ────────────────────────────────────────────────────────────────

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
    const prevDate = currentJob.scheduled_date
    const prevTime = currentJob.scheduled_time
    const isFirstSchedule = currentJob.status !== 'scheduled'
    const isDateChange = !isFirstSchedule && prevDate && scheduledDate && scheduledDate !== prevDate

    setCurrentJob((prev) => ({
      ...prev,
      status: 'scheduled',
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      scheduled_duration: scheduledDuration,
      reschedule_count: isDateChange ? (prev.reschedule_count || 0) + 1 : (prev.reschedule_count || 0),
    }))

    if (isDateChange) {
      setRescheduleMsg(
        `Job moved from ${formatScheduledDateTime(prevDate, prevTime)} to ${formatScheduledDateTime(scheduledDate, scheduledTime)}.`
      )
    }
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

  function handleDeclineConfirm() {
    setCurrentJob((prev) => ({ ...prev, status: 'declined' }))
    setDeclineModalOpen(false)
  }

  function handleMarkPaid() {
    setCurrentJob((prev) => ({ ...prev, payment_status: 'paid', paid_at: new Date().toISOString() }))
    setPayModalOpen(false)
  }

  function handleMarkUnpaid() {
    setCurrentJob((prev) => ({ ...prev, payment_status: 'unpaid', paid_at: null }))
    setUnpayModalOpen(false)
  }

  function handleRequote() {
    setCurrentJob((prev) => ({ ...prev, status: 'draft' }))
    router.push(`/jobs/${params.id}/quote`)
  }

  async function handleDownloadPdf() {
    const lh  = currentJob.labour_hours || 0
    const cf  = currentJob.callout_fee  || 0
    const hr  = currentJob.hourly_rate  || settings.hourly_labour_rate
    const pts = (currentJob.items || [])
      .flatMap((i) => i.parts || [])
      .reduce((s, p) => s + p.sell_price * p.qty, 0)
    const sub = pts + lh * hr + cf
    const g   = calcGst(sub, settings.gst_rate)
    const hasBeforePhotos = allBeforePhotos.length > 0
    try {
      const blob = await generateQuotePdf({
        job: currentJob, settings,
        labourHours: lh, calloutFee: cf, hourlyRate: hr,
        subtotal: sub, gst: g, total: sub + g,
        acceptanceUrl: `https://awesome-quote.vercel.app/accept/${currentJob.id}`,
        photosUrl: hasBeforePhotos ? `https://awesome-quote.vercel.app/done/${currentJob.id}` : null,
      })
      const safeName = (currentJob.customer_name || 'quote')
        .replace(/[^a-z0-9]/gi, '-').toLowerCase()
      downloadBlob(blob, `quote-${safeName}.pdf`)
    } catch (err) {
      console.error('PDF download failed:', err)
    }
  }

  // ── Shared blocks ────────────────────────────────────────────────────────────

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

  const afterPhotosCard = (
    <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
      <PhotoCapture
        label="After photos"
        buttonLabel="Add after photo"
        photos={afterPhotos}
        onChange={handleAfterPhotosChange}
        uploadOpts={{ jobId: currentJob.id, type: 'after' }}
      />
      {afterPhotos.length > 0 && (
        <p className="text-caption text-aq-muted mt-aq-md">
          Share with customer: <a
            href={`/done/${currentJob.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-aq-green underline"
          >before and after page</a>
        </p>
      )}
    </div>
  )

  const showTracker = ['accepted', 'ordered', 'scheduled', 'completed', 'invoiced'].includes(status)
  const trackerCard = (
    <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
      <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Status</h2>
      <StatusTracker status={status} />
    </div>
  )

  const profitCard = (
    <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg">
      <div className="flex items-center gap-aq-sm mb-aq-md">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          className="text-aq-green shrink-0">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <h2 className="text-section font-medium text-aq-ink">Job profit</h2>
      </div>
      <div className="flex flex-col gap-aq-xs mb-aq-md">
        <div className="flex justify-between">
          <span className="text-secondary text-aq-muted">You charged</span>
          <span className="text-secondary text-aq-ink">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary text-aq-muted">Parts cost you</span>
          <span className="text-secondary text-aq-ink">{formatCurrency(partsGrossCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary text-aq-muted">Labour and callout</span>
          <span className="text-secondary text-aq-ink">{formatCurrency(labourTotal + calloutFee)}</span>
        </div>
      </div>
      <div className="flex justify-between items-baseline border-t border-aq-green-tint-border pt-aq-sm">
        <span className="text-body font-medium text-aq-ink">Profit</span>
        <span className={`text-section font-medium ${profitMargin >= 0.20 ? 'text-aq-green' : 'text-aq-gold'}`}>
          {formatCurrency(profit)}
        </span>
      </div>
      <p className="text-caption text-aq-muted mt-aq-md">
        For your eyes only. This never appears on customer documents.
      </p>
    </div>
  )

  // ── STATUS-SPECIFIC SECTIONS ─────────────────────────────────────────────────

  // ── DRAFT ────────────────────────────────────────────────────────────────────
  const draftContent = status === 'draft' && (
    <>
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

  // ── QUOTED ───────────────────────────────────────────────────────────────────
  const quotedContent = status === 'quoted' && (
    <>
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
        <Button variant="destructive" fullWidth onClick={() => setDeclineModalOpen(true)}>
          Mark as declined
        </Button>
      </div>
    </>
  )

  // ── ACCEPTED / ORDERED ───────────────────────────────────────────────────────
  const acceptedContent = (status === 'accepted' || status === 'ordered') && (
    <>
      {quoteSummaryCard}
      {profitCard}
      {afterPhotosCard}

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
          {status !== 'completed' && status !== 'invoiced' && (
            <Button variant="secondary" fullWidth onClick={() => setCompleteModalOpen(true)}>
              Job completed
            </Button>
          )}
          <Button variant="secondary" fullWidth
            onClick={() => router.push(`/jobs/${params.id}/quote?revise=true`)}>
            Revise quote
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

  // ── SCHEDULED ────────────────────────────────────────────────────────────────
  const scheduledContent = status === 'scheduled' && (
    <>
      {/* Reschedule confirmation message */}
      {rescheduleMsg && (
        <div className="bg-aq-info-tint border border-aq-info-tint-border rounded-aq-xl px-aq-lg py-aq-md">
          <p className="text-secondary text-aq-info">{rescheduleMsg}</p>
        </div>
      )}

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
            {(currentJob.reschedule_count || 0) > 0 && (
              <p className="text-caption text-aq-muted mt-aq-sm">
                Rescheduled {currentJob.reschedule_count} {currentJob.reschedule_count === 1 ? 'time' : 'times'}
              </p>
            )}
          </div>
        ) : !scheduleOpen ? (
          <p className="text-secondary text-aq-muted">No schedule set.</p>
        ) : null}

        {scheduleOpen && (
          <div className="flex flex-col gap-aq-md">
            {schedulePickers}
            <Button variant="secondary" fullWidth
              disabled={!scheduledDate || !scheduledTime}
              onClick={handleSaveSchedule}>
              Save schedule
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-aq-sm">
        {status !== 'completed' && status !== 'invoiced' && (
          <Button variant="primary" fullWidth onClick={() => setCompleteModalOpen(true)}>
            Job completed
          </Button>
        )}
        <Button variant="secondary" fullWidth
          onClick={() => router.push(`/jobs/${params.id}/quote?revise=true`)}>
          Revise quote
        </Button>
      </div>

      {quoteSummaryCard}
      {profitCard}
      {afterPhotosCard}
      {trackerCard}
    </>
  )

  // ── COMPLETED / INVOICED ─────────────────────────────────────────────────────
  const completedContent = (status === 'completed' || status === 'invoiced') && (
    <>
      <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl px-aq-lg py-aq-md">
        <p className="text-body font-medium text-aq-green text-center">
          {status === 'invoiced' ? 'Invoiced' : 'Job complete'}
        </p>
      </div>

      {/* Payment tracking — invoiced only */}
      {status === 'invoiced' && (
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
          <div className="flex items-center justify-between mb-aq-md">
            <h2 className="text-section font-medium text-aq-ink">Payment</h2>
            {currentJob.payment_status === 'paid'
              ? <span className="text-secondary font-medium text-aq-green">Paid</span>
              : <StatusBadge status="unpaid" />
            }
          </div>
          {currentJob.payment_status === 'paid' ? (
            <>
              {currentJob.paid_at && (
                <p className="text-secondary text-aq-muted mb-aq-md">
                  Paid on {formatPaidDate(currentJob.paid_at)}
                </p>
              )}
              <Button variant="secondary" fullWidth onClick={() => setUnpayModalOpen(true)}>
                Mark as unpaid
              </Button>
            </>
          ) : (
            <Button variant="primary" fullWidth onClick={() => setPayModalOpen(true)}>
              Mark as paid
            </Button>
          )}
        </div>
      )}

      {quoteSummaryCard}
      {profitCard}
      {afterPhotosCard}

      <div className="flex flex-col gap-aq-sm">
        {status === 'completed' && (
          <Button variant="primary" fullWidth onClick={() => setXeroModalOpen(true)}>
            Send to Xero
          </Button>
        )}
        <Button variant="secondary" fullWidth onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        {(allBeforePhotos.length > 0 || afterPhotos.length > 0) && (
          <Button variant="secondary" fullWidth onClick={handleDownloadPhotos}>
            Download photos
          </Button>
        )}
      </div>

      {trackerCard}
    </>
  )

  // ── DECLINED ─────────────────────────────────────────────────────────────────
  const declinedContent = status === 'declined' && (
    <>
      <div className="bg-aq-surface border border-aq-border rounded-aq-xl px-aq-lg py-aq-md">
        <p className="text-body font-medium text-aq-muted text-center">Quote declined</p>
      </div>

      {quoteSummaryCard}

      <div className="flex flex-col gap-aq-sm">
        <Button variant="secondary" fullWidth onClick={handleRequote}>
          Re-quote
        </Button>
      </div>
    </>
  )

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

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
            {declinedContent}
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
        question={`Download the quote PDF to resend to ${currentJob.customer_name}.`}
        confirmLabel="Yes, resend"
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

      <ConfirmModal
        open={declineModalOpen}
        question="Mark this quote as declined?"
        confirmLabel="Yes, mark declined"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeclineConfirm}
        onCancel={() => setDeclineModalOpen(false)}
      />

      <ConfirmModal
        open={payModalOpen}
        question={`Mark this invoice as paid? Total ${formatCurrency(jobTotal)}.`}
        confirmLabel="Yes, mark paid"
        cancelLabel="Not yet"
        onConfirm={handleMarkPaid}
        onCancel={() => setPayModalOpen(false)}
      />

      <ConfirmModal
        open={unpayModalOpen}
        question="Mark this invoice as unpaid?"
        confirmLabel="Yes, mark unpaid"
        cancelLabel="Cancel"
        onConfirm={handleMarkUnpaid}
        onCancel={() => setUnpayModalOpen(false)}
      />
    </>
  )
}
