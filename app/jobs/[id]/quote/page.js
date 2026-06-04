'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, calcGst } from '@/lib/pricing'
import { generateQuotePdf, downloadBlob } from '@/lib/generate-quote-pdf'
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
  const zones = settings.callout_zones || []

  const [quoteParts, setQuoteParts] = useState(() => {
    if (!currentJob) return []
    return (currentJob.items || []).flatMap((item, iIdx) => {
      const itemLabel = item.type === 'diagnosed'
        ? [item.joinery_type_label, item.fault_label].filter(Boolean).join(' - ')
        : (item.description || 'Custom item')
      return (item.parts || []).map((p, pIdx) => ({
        _key: `${item.id || iIdx}-${p.part_id || pIdx}`,
        _itemId: item.id || String(iIdx),
        _itemLabel: itemLabel,
        name: p.name,
        sku: p.sku,
        sell_price: p.sell_price,
        qty: p.qty,
        unit: p.unit,
      }))
    })
  })

  const [labourHours, setLabourHours] = useState(() => {
    const saved = currentJob?.labour_hours
    if (saved > 0) return saved
    if (currentJob?.estimated_duration > 0) return currentJob.estimated_duration
    return 1
  })

  const initFee = currentJob?.callout_fee ?? zones[0]?.fee ?? 0
  const initZone = currentJob?.callout_fee != null
    ? zones.find((z) => z.fee === currentJob.callout_fee)
    : zones[0]
  const [calloutFee, setCalloutFee] = useState(initFee)
  const [selectedZoneId, setSelectedZoneId] = useState(initZone?.id ?? null)
  const [manualInput, setManualInput] = useState(
    currentJob?.callout_fee != null && !initZone ? String(initFee) : ''
  )

  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendPhase, setSendPhase] = useState(null)

  // Revise mode state
  const [isRevise, setIsRevise] = useState(false)
  const [originalTotal] = useState(() => {
    if (!currentJob) return 0
    const partsSum = (currentJob.items || [])
      .flatMap((i) => i.parts || [])
      .reduce((s, p) => s + p.sell_price * p.qty, 0)
    const sub = partsSum + (currentJob.labour_hours || 0) * hourlyRate + (currentJob.callout_fee || 0)
    return sub + calcGst(sub, GST_RATE)
  })
  const [reviseNote, setReviseNote] = useState('')
  const [reviseModalOpen, setReviseModalOpen] = useState(false)

  useEffect(() => {
    setIsRevise(new URLSearchParams(window.location.search).get('revise') === 'true')
  }, [])

  const groupedQuoteParts = (() => {
    const map = new Map()
    for (const p of quoteParts) {
      if (!map.has(p._itemId)) map.set(p._itemId, { label: p._itemLabel, parts: [] })
      map.get(p._itemId).parts.push(p)
    }
    return [...map.entries()].map(([itemId, g]) => ({ itemId, ...g }))
  })()

  const partsSubtotal = quoteParts.reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourTotal = labourHours * hourlyRate
  const subtotal = partsSubtotal + labourTotal + calloutFee
  const gst = calcGst(subtotal, GST_RATE)
  const total = subtotal + gst

  const newVersion = (currentJob?.quote_version || 1) + 1

  function removePart(key) {
    setQuoteParts((prev) => prev.filter((p) => p._key !== key))
  }

  function selectZone(zone) {
    setSelectedZoneId(zone.id)
    setCalloutFee(zone.fee)
    setManualInput('')
  }

  function handleManualInput(val) {
    setManualInput(val)
    setSelectedZoneId(null)
    setCalloutFee(parseFloat(val) || 0)
  }

  async function handleSendConfirm() {
    setSendModalOpen(false)
    setSendPhase('generating')
    try {
      const blob = await generateQuotePdf({
        job: currentJob,
        settings,
        labourHours,
        calloutFee,
        hourlyRate,
        subtotal,
        gst,
        total,
        acceptanceUrl: `https://awesome-quote.vercel.app/accept/${params.id}`,
        logoUrl: settings.logo_url || null,
      })
      const safeName = (currentJob.customer_name || 'quote')
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()
      downloadBlob(blob, `quote-${safeName}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setCurrentJob((prev) =>
      prev
        ? { ...prev, status: 'quoted', labour_hours: labourHours, callout_fee: calloutFee, hourly_rate: hourlyRate }
        : prev
    )
    setSendPhase('done')
  }

  async function handleReviseConfirm() {
    setReviseModalOpen(false)
    setSendPhase('generating')
    try {
      const blob = await generateQuotePdf({
        job: currentJob,
        settings,
        labourHours,
        calloutFee,
        hourlyRate,
        subtotal,
        gst,
        total,
        acceptanceUrl: `https://awesome-quote.vercel.app/accept/${params.id}`,
        quoteVersion: newVersion,
        isRevision: true,
        logoUrl: settings.logo_url || null,
      })
      const safeName = (currentJob.customer_name || 'quote')
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()
      downloadBlob(blob, `quote-${safeName}-v${newVersion}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setCurrentJob((prev) =>
      prev
        ? {
            ...prev,
            status: 'quoted',
            labour_hours: labourHours,
            callout_fee: calloutFee,
            hourly_rate: hourlyRate,
            quote_version: newVersion,
            previous_total: originalTotal,
            revision_note: reviseNote || null,
          }
        : prev
    )
    setSendPhase('done')
  }

  function handleSaveDraft() {
    setCurrentJob((prev) =>
      prev
        ? { ...prev, status: 'draft', labour_hours: labourHours, callout_fee: calloutFee, hourly_rate: hourlyRate }
        : prev
    )
    router.push('/')
  }

  if (sendPhase === 'generating') {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <p className="text-body text-aq-muted">Generating PDF...</p>
      </div>
    )
  }

  if (sendPhase === 'done') {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="max-w-[480px] w-full mx-auto">
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-2xl mb-aq-lg text-center">
            <p className="text-section font-medium text-aq-ink mb-aq-sm">Quote downloaded.</p>
            <p className="text-body text-aq-muted">
              Email it to {currentJob?.customer_name}.
            </p>
          </div>
          <Button variant="primary" fullWidth onClick={() => router.replace(`/jobs/${params.id}`)}>
            Go to job
          </Button>
        </div>
      </div>
    )
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
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        {/* Header */}
        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton
            onClick={() => router.push(`/jobs/${params.id}/items`)}
            label="Items"
          />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">
            {isRevise ? `Revising quote (version ${newVersion})` : 'Quote builder'}
          </h1>
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
              {groupedQuoteParts.map((group, gIdx) => {
                const groupTotal = group.parts.reduce((s, p) => s + p.sell_price * p.qty, 0)
                return (
                  <div key={group.itemId} className={gIdx > 0 ? 'mt-aq-md pt-aq-md border-t border-aq-border' : ''}>
                    {groupedQuoteParts.length > 1 && (
                      <p className="text-caption font-medium text-aq-muted mb-aq-sm">{group.label}</p>
                    )}
                    {group.parts.map((p) => (
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
                    {groupedQuoteParts.length > 1 && (
                      <div className="flex justify-between items-baseline pt-aq-xs mt-aq-xs">
                        <span className="text-caption text-aq-muted">Item subtotal</span>
                        <span className="text-secondary font-medium text-aq-ink w-[72px] text-right">
                          {formatCurrency(groupTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
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
              min={0.5}
              step={0.5}
            />
            <span className="text-secondary text-aq-muted shrink-0">
              {formatCurrency(hourlyRate)}/hr
            </span>
          </div>
        </div>

        {/* Callout fee */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <div className="flex items-center justify-between mb-aq-md">
            <div>
              <h2 className="text-body font-medium text-aq-ink">Callout fee</h2>
              <p className="text-caption text-aq-muted mt-[2px]">
                {selectedZoneId ? zones.find((z) => z.id === selectedZoneId)?.name : 'Custom'}
              </p>
            </div>
            <span className="text-body font-medium text-aq-ink">{formatCurrency(calloutFee)}</span>
          </div>

          {/* Zone pills */}
          {zones.length > 0 && (
            <div className="flex flex-wrap gap-aq-sm mb-aq-md">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => selectZone(zone)}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                    selectedZoneId === zone.id
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border bg-white text-aq-muted hover:bg-aq-surface'
                  }`}
                >
                  {zone.name} {formatCurrency(zone.fee)}
                </button>
              ))}
            </div>
          )}

          {/* Manual override */}
          <p className="text-caption text-aq-muted mb-aq-sm">Manual override</p>
          <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
            <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-r border-aq-border shrink-0">
              $
            </span>
            <input
              type="number"
              value={manualInput}
              onChange={(e) => handleManualInput(e.target.value)}
              placeholder="Enter custom amount"
              className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0"
            />
          </div>
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
          {isRevise ? (
            <>
              <Button variant="primary" fullWidth onClick={() => setReviseModalOpen(true)}>
                Send revised quote
              </Button>
              <Button variant="secondary" fullWidth onClick={() => router.push(`/jobs/${params.id}`)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" fullWidth onClick={() => setSendModalOpen(true)}>
                Send quote
              </Button>
              <Button variant="secondary" fullWidth onClick={handleSaveDraft}>
                Save draft
              </Button>
            </>
          )}
        </div>

      </div>

      {/* Normal send modal */}
      <ConfirmModal
        open={sendModalOpen}
        question={`Send this quote for ${formatCurrency(total)} to ${currentJob.customer_name}?`}
        confirmLabel="Yes, send"
        cancelLabel="Not yet"
        onConfirm={handleSendConfirm}
        onCancel={() => setSendModalOpen(false)}
      />

      {/* Revise confirm modal — custom, has text input for revision note */}
      {reviseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-aq-xl"
          style={{ backgroundColor: 'rgba(31, 45, 55, 0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-aq-xl p-aq-xl w-full max-w-sm shadow-lg">
            <p className="text-body font-medium text-aq-ink mb-aq-sm">
              Send revised quote to {currentJob.customer_name}?
            </p>
            <p className="text-secondary text-aq-muted mb-aq-lg">
              The new total is {formatCurrency(total)}, up from {formatCurrency(originalTotal)}. They will need to accept again.
            </p>
            <div className="mb-aq-lg">
              <label className="block text-secondary text-aq-muted mb-aq-sm">
                Note about changes (optional)
              </label>
              <input
                type="text"
                value={reviseNote}
                onChange={(e) => setReviseNote(e.target.value)}
                placeholder="e.g. Added second roller set"
                className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-3 text-body text-aq-ink focus:outline-none focus:border-aq-green transition-colors"
              />
            </div>
            <div className="flex flex-col gap-aq-sm">
              <button
                type="button"
                onClick={handleReviseConfirm}
                className="w-full min-h-tap text-btn font-medium rounded-aq-lg bg-aq-green text-white hover:bg-aq-green-hover active:bg-aq-green-pressed transition-colors duration-150"
              >
                Yes, send revised quote
              </button>
              <button
                type="button"
                onClick={() => setReviseModalOpen(false)}
                className="w-full min-h-tap text-btn font-medium rounded-aq-lg bg-white text-aq-ink border border-aq-border hover:bg-aq-surface active:bg-aq-border transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
