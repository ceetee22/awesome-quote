'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, calcGst } from '@/lib/pricing'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import Stepper from '@/components/Stepper'
import ConfirmModal from '@/components/ConfirmModal'

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export default function QuotePage() {
  const params = useParams()
  const router = useRouter()
  const { currentJob, setCurrentJob } = useJob()
  const { settings } = useSettings()

  const hourlyRate = currentJob?.hourly_rate || settings.hourly_labour_rate
  const GST_RATE = settings.gst_rate
  const defaultCalloutFee = settings.callout_zones?.[0]?.fee ?? 50

  // Flatten all parts from all job items into a single quote parts list.
  // Each part gets a unique _key so individual lines can be removed.
  const [quoteParts, setQuoteParts] = useState(() => {
    if (!currentJob) return []
    return (currentJob.items || []).flatMap((item, iIdx) =>
      (item.parts || []).map((p, pIdx) => ({
        _key: `${item.id || iIdx}-${p.part_id || pIdx}`,
        name: p.name,
        sku: p.sku,
        sell_price: p.sell_price,
        qty: p.qty,
        unit: p.unit,
      }))
    )
  })

  const [labourHours, setLabourHours] = useState(currentJob?.labour_hours ?? 0)
  const [calloutFee, setCalloutFee] = useState(
    currentJob?.callout_fee != null ? currentJob.callout_fee : defaultCalloutFee
  )
  const [overriding, setOverriding] = useState(false)
  const [overrideInput, setOverrideInput] = useState(
    String(currentJob?.callout_fee != null ? currentJob.callout_fee : defaultCalloutFee)
  )
  const [sendModalOpen, setSendModalOpen] = useState(false)

  const partsSubtotal = quoteParts.reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourTotal = labourHours * hourlyRate
  const subtotal = partsSubtotal + labourTotal + calloutFee
  const gst = calcGst(subtotal, GST_RATE)
  const total = subtotal + gst

  function removePart(key) {
    setQuoteParts((prev) => prev.filter((p) => p._key !== key))
  }

  function showOverride() {
    setOverrideInput(String(calloutFee))
    setOverriding(true)
  }

  function commitOverride() {
    setCalloutFee(parseFloat(overrideInput) || 0)
    setOverriding(false)
  }

  function handleSendConfirm() {
    setCurrentJob((prev) =>
      prev
        ? { ...prev, status: 'quoted', labour_hours: labourHours, callout_fee: calloutFee, hourly_rate: hourlyRate }
        : prev
    )
    setSendModalOpen(false)
    router.replace(`/jobs/${params.id}`)
  }

  function handleSaveDraft() {
    setCurrentJob((prev) =>
      prev
        ? { ...prev, status: 'draft', labour_hours: labourHours, callout_fee: calloutFee, hourly_rate: hourlyRate }
        : prev
    )
    router.push('/')
  }

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="text-center">
          <p className="text-body text-aq-muted mb-aq-lg">No job in progress.</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Go home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton
            onClick={() => router.push(`/jobs/${params.id}/items`)}
            label="Items"
          />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Quote builder</h1>
        </div>

        {/* Customer summary */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <p className="text-body font-medium text-aq-ink">{currentJob.customer_name}</p>
          {currentJob.customer_address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(currentJob.customer_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary text-aq-muted hover:text-aq-green transition-colors block mt-aq-xs"
            >
              {currentJob.customer_address}
            </a>
          )}
          {currentJob.customer_phone && (
            <a
              href={`tel:${currentJob.customer_phone}`}
              className="text-secondary text-aq-muted hover:text-aq-green transition-colors block mt-aq-xs"
            >
              {currentJob.customer_phone}
            </a>
          )}
        </div>

        {/* Parts breakdown */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <h2 className="text-section font-medium text-aq-ink mb-aq-md">Parts</h2>
          {quoteParts.length === 0 ? (
            <p className="text-secondary text-aq-muted mb-aq-md">No parts added.</p>
          ) : (
            <div className="mb-aq-md">
              {quoteParts.map((p) => (
                <div
                  key={p._key}
                  className="flex items-center gap-aq-sm py-aq-sm border-b border-aq-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-secondary font-medium text-aq-ink leading-snug truncate">
                      {p.name}
                    </p>
                    <p className="text-caption text-aq-subtle">
                      x{p.qty} @ {formatCurrency(p.sell_price)}/{p.unit}
                    </p>
                  </div>
                  <span className="text-secondary font-medium text-aq-ink shrink-0 w-[72px] text-right">
                    {formatCurrency(p.sell_price * p.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePart(p._key)}
                    className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-error hover:bg-aq-error-tint rounded-aq-md transition-colors"
                    aria-label={`Remove ${p.name}`}
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="secondary"
            fullWidth
            onClick={() => router.push(`/jobs/${params.id}/items/add`)}
          >
            Add more parts
          </Button>
        </div>

        {/* Labour */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <div className="flex items-center justify-between mb-aq-md">
            <h2 className="text-section font-medium text-aq-ink">Labour</h2>
            <span className="text-body font-medium text-aq-ink">
              {formatCurrency(labourTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-aq-md">
            <Stepper
              value={labourHours}
              onChange={setLabourHours}
              min={0}
              max={20}
              step={0.5}
            />
            <span className="text-secondary text-aq-muted shrink-0">
              {formatCurrency(hourlyRate)}/hr
            </span>
          </div>
        </div>

        {/* Callout fee */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <h2 className="text-section font-medium text-aq-ink mb-aq-md">Callout fee</h2>
          {overriding ? (
            <div className="flex items-center gap-aq-sm">
              <input
                type="number"
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink focus:outline-none focus:border-aq-green transition-colors"
              />
              <Button variant="primary" onClick={commitOverride}>
                Set
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-secondary text-aq-muted">Local zone</span>
              <div className="flex items-center gap-aq-md">
                <span className="text-body font-medium text-aq-ink">
                  {formatCurrency(calloutFee)}
                </span>
                <button
                  type="button"
                  onClick={showOverride}
                  className="text-aq-green text-secondary font-medium min-h-tap px-aq-sm flex items-center"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg mb-aq-2xl">
          <div className="flex justify-between items-baseline mb-aq-sm">
            <span className="text-secondary text-aq-muted">Subtotal</span>
            <span className="text-body font-medium text-aq-ink">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between items-baseline mb-aq-md pb-aq-md border-b border-aq-green-tint-border">
            <span className="text-secondary text-aq-muted">GST (15%)</span>
            <span className="text-secondary text-aq-muted">{formatCurrency(gst)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-body font-medium text-aq-ink">Total (incl. GST)</span>
            <span className="text-display font-medium text-aq-ink">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-aq-sm">
          <Button variant="primary" fullWidth onClick={() => setSendModalOpen(true)}>
            Send quote
          </Button>
          <Button variant="secondary" fullWidth onClick={handleSaveDraft}>
            Save draft
          </Button>
        </div>

      </div>

      <ConfirmModal
        open={sendModalOpen}
        question={`Send this quote for ${formatCurrency(total)} to ${currentJob.customer_name}?`}
        confirmLabel="Yes, send"
        cancelLabel="Not yet"
        onConfirm={handleSendConfirm}
        onCancel={() => setSendModalOpen(false)}
      />
    </div>
  )
}
