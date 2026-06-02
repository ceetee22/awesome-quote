'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import {
  JOB_SOURCE_LABELS,
  JOINERY_TYPE_LABELS,
  FAULT_OPTIONS,
} from '@/lib/constants'
import { formatCurrency, calcGst } from '@/lib/pricing'
import Button from '@/components/Button'
import StatusBadge from '@/components/StatusBadge'
import DurationPresets from '@/components/DurationPresets'
import ConfirmModal from '@/components/ConfirmModal'

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

function MapPinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// Horizontal progress tracker: Draft > Quoted > Accepted > Ordered > Done
const TRACKER_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'completed', label: 'Done' },
]

const STATUS_STEP_INDEX = {
  draft: 0,
  quoted: 1,
  awaiting: 1,
  accepted: 2,
  scheduled: 2,
  ordered: 3,
  completed: 4,
  invoiced: 4,
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
                <div
                  className={`flex-1 h-0.5 ${i <= stepIdx ? 'bg-aq-green' : 'bg-aq-border'}`}
                />
              )}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  i < stepIdx
                    ? 'bg-aq-green border-aq-green'
                    : i === stepIdx
                    ? 'bg-aq-green border-aq-green'
                    : 'bg-white border-aq-border'
                }`}
              >
                {i < stepIdx ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path
                      d="M2 5l2 2 4-4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : i === stepIdx ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : null}
              </div>
              {i < TRACKER_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${i < stepIdx ? 'bg-aq-green' : 'bg-aq-border'}`}
                />
              )}
            </div>
            <p
              className={`text-[11px] mt-1 text-center leading-tight ${
                i <= stepIdx ? 'text-aq-green font-medium' : 'text-aq-muted'
              }`}
            >
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  const scheduleRef = useRef(null)

  // When navigating directly to a job (e.g. from the quotes list), select it
  useEffect(() => {
    const match = jobs.find((j) => j.id === params.id)
    if (match) selectJob(params.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const [scheduledDate, setScheduledDate] = useState(currentJob?.scheduled_date || '')
  const [scheduledTime, setScheduledTime] = useState(currentJob?.scheduled_time || '')
  const [scheduledDuration, setScheduledDuration] = useState(currentJob?.scheduled_duration || 0)
  const [xeroModalOpen, setXeroModalOpen] = useState(false)

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="text-center">
          <p className="text-body text-aq-muted mb-aq-lg">No active job.</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Go home
          </Button>
        </div>
      </div>
    )
  }

  const hourlyRate = currentJob.hourly_rate || settings.hourly_labour_rate

  // Compute job financials from items
  const partsTotal = (currentJob.items || [])
    .flatMap((i) => i.parts || [])
    .reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourTotal = (currentJob.items || []).reduce(
    (s, i) => s + (i.labour_hours || 0) * hourlyRate,
    0
  )
  const calloutFee = currentJob.callout_fee || 0
  const subtotal = partsTotal + labourTotal + calloutFee
  const gst = calcGst(subtotal, settings.gst_rate)
  const jobTotal = subtotal + gst

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

  function handleXeroConfirm() {
    setCurrentJob((prev) => ({ ...prev, status: 'invoiced' }))
    setXeroModalOpen(false)
  }

  const mapsUrl = currentJob.customer_address
    ? `https://maps.google.com/?q=${encodeURIComponent(currentJob.customer_address)}`
    : null

  return (
    <>
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

          {/* Header */}
          <div className="flex items-center gap-aq-sm py-aq-xl">
            <button
              type="button"
              onClick={() => router.back()}
              className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-green -ml-3"
              aria-label="Go back"
            >
              <BackArrow />
            </button>
            <h1 className="text-page-title font-medium text-aq-ink">Job detail</h1>
          </div>

          <div className="flex flex-col gap-aq-lg">

            {/* Customer contact */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <div className="flex items-start justify-between gap-aq-sm mb-aq-sm">
                <h2 className="text-section font-medium text-aq-ink leading-snug">
                  {currentJob.customer_name}
                </h2>
                <StatusBadge status={currentJob.status} />
              </div>

              {currentJob.customer_address && mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-aq-xs text-secondary text-aq-green hover:text-aq-green-hover transition-colors mb-aq-xs"
                >
                  <MapPinIcon />
                  {currentJob.customer_address}
                </a>
              )}

              {currentJob.customer_phone && (
                <a
                  href={`tel:${currentJob.customer_phone}`}
                  className="block text-secondary text-aq-green hover:text-aq-green-hover transition-colors mb-aq-md"
                >
                  {currentJob.customer_phone}
                </a>
              )}

              {currentJob.source && (
                <p className="text-caption text-aq-muted mb-aq-md">
                  {JOB_SOURCE_LABELS[currentJob.source] || currentJob.source}
                </p>
              )}

              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" fullWidth>
                    Navigate
                  </Button>
                </a>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg" ref={scheduleRef}>
              <h2 className="text-section font-medium text-aq-ink mb-aq-md">Schedule</h2>

              {scheduledDate && scheduledTime && (
                <p className="text-body text-aq-ink mb-aq-md">
                  {formatScheduledDateTime(scheduledDate, scheduledTime)}
                </p>
              )}

              <div className="flex gap-aq-sm mb-aq-md">
                <div className="flex-1">
                  <label
                    htmlFor="sched-date"
                    className="block text-secondary text-aq-muted mb-aq-sm"
                  >
                    Date
                  </label>
                  <input
                    id="sched-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-3 text-body text-aq-ink focus:outline-none focus:border-aq-green transition-colors duration-150"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="sched-time"
                    className="block text-secondary text-aq-muted mb-aq-sm"
                  >
                    Time
                  </label>
                  <input
                    id="sched-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-3 text-body text-aq-ink focus:outline-none focus:border-aq-green transition-colors duration-150"
                  />
                </div>
              </div>

              <p className="text-secondary text-aq-muted mb-aq-sm">Duration</p>
              <DurationPresets value={scheduledDuration} onChange={handleDurationChange} />
            </div>

            {/* Job items summary */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-md">Items</h2>

              {(currentJob.items || []).length === 0 ? (
                <p className="text-secondary text-aq-muted mb-aq-md">No items added yet.</p>
              ) : (
                <div className="mb-aq-md">
                  {(currentJob.items || []).map((item) => {
                    const iTotal =
                      (item.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0) +
                      (item.labour_hours || 0) * hourlyRate
                    const partsCount = (item.parts || []).length

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => router.push(`/jobs/${params.id}/items`)}
                        className="w-full flex items-center justify-between gap-aq-sm py-aq-sm border-b border-aq-border last:border-0 hover:bg-aq-surface -mx-aq-lg px-aq-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0 text-left">
                          {item.type === 'custom' ? (
                            <div className="flex items-center gap-aq-sm">
                              <StatusBadge status="custom" label="Custom" />
                              {item.description && (
                                <p className="text-secondary text-aq-ink truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-secondary font-medium text-aq-ink leading-snug truncate">
                              {JOINERY_TYPE_LABELS[item.joinery_type] || item.joinery_type}
                              {item.fault
                                ? ` — ${getFaultLabel(item.joinery_type, item.fault)}`
                                : ''}
                            </p>
                          )}
                          <p className="text-caption text-aq-muted mt-0.5">
                            {partsCount} {partsCount === 1 ? 'part' : 'parts'}
                          </p>
                        </div>
                        <span className="text-secondary font-medium text-aq-ink shrink-0">
                          {formatCurrency(iTotal)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-between items-baseline">
                <span className="text-body font-medium text-aq-ink">Total (incl. GST)</span>
                <span className="text-body font-medium text-aq-ink">{formatCurrency(jobTotal)}</span>
              </div>
            </div>

            {/* Status tracker */}
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Status</h2>
              <StatusTracker status={currentJob.status} />
            </div>

            {/* Post-acceptance actions — only visible when status is accepted */}
            {currentJob.status === 'accepted' && (
              <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
                <h2 className="text-section font-medium text-aq-ink mb-aq-lg">Next steps</h2>
                <div className="flex flex-col gap-aq-sm">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setXeroModalOpen(true)}
                  >
                    Send to Xero
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => router.push(`/jobs/${params.id}/order`)}
                  >
                    Order parts
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() =>
                      scheduleRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Schedule return visit
                  </Button>
                </div>
              </div>
            )}

            {/* Dev tool: simulate acceptance */}
            {currentJob.status !== 'accepted' && currentJob.status !== 'invoiced' && (
              <div className="bg-aq-gold-tint border border-aq-gold-tint-border rounded-aq-xl p-aq-lg">
                <p className="text-caption text-aq-muted mb-aq-sm">Dev tool</p>
                <Button
                  variant="gold"
                  fullWidth
                  onClick={() =>
                    setCurrentJob((prev) => ({ ...prev, status: 'accepted' }))
                  }
                >
                  Simulate acceptance
                </Button>
              </div>
            )}

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
    </>
  )
}
