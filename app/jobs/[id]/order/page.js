'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { getDefaultSupplier, updateSupplier } from '@/lib/db'
import { formatCurrency } from '@/lib/pricing'
import { generatePoPdf } from '@/lib/generate-po-pdf'
import { downloadBlob } from '@/lib/generate-quote-pdf'
import BackButton from '@/components/BackButton'
import Button from '@/components/Button'
import Stepper from '@/components/Stepper'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'
const btnPrimary =
  'w-full min-h-tap text-btn font-medium rounded-aq-lg bg-aq-green text-white hover:bg-aq-green-hover active:bg-aq-green-pressed disabled:opacity-50 transition-colors duration-150'
const btnSecondary =
  'w-full min-h-tap text-btn font-medium rounded-aq-lg bg-white text-aq-ink border border-aq-border hover:bg-aq-surface active:bg-aq-border transition-colors duration-150'
const btnGhost =
  'w-full min-h-tap text-btn font-medium rounded-aq-lg text-aq-muted hover:text-aq-ink transition-colors duration-150'

function ToggleSwitch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex shrink-0 h-7 w-12 rounded-full transition-colors duration-150 focus:outline-none ${
        on ? 'bg-aq-green' : 'bg-aq-border'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 mt-0.5 rounded-full bg-white shadow transition-transform duration-150 ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const { currentJob, setCurrentJob } = useJob()
  const { settings } = useSettings()

  const [phase, setPhase] = useState('review') // review | sending | done | error
  const [supplier, setSupplier] = useState(null)
  const [collectionMethod, setCollectionMethod] = useState('pickup')
  const [deliverySource, setDeliverySource] = useState('business')
  const [customAddress, setCustomAddress] = useState('')

  const [sendOutcome, setSendOutcome] = useState(null) // { type: 'emailed', email } | { type: 'downloaded' }
  const [sendError, setSendError] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [saveEmailToSupplier, setSaveEmailToSupplier] = useState(false)

  useEffect(() => {
    getDefaultSupplier().then(setSupplier)
  }, [])

  const initialLines = useMemo(() => {
    if (!currentJob) return []
    const lines = []
    ;(currentJob.items || []).forEach((item) => {
      ;(item.parts || []).forEach((part) => {
        lines.push({
          id: part.id || `${item.id}-${part.part_id}`,
          part_id: part.part_id,
          name: part.name,
          sku: part.sku,
          supplier_code: part.supplier_code,
          cost_price: part.cost_price || 0,
          qty: part.qty || 1,
          enabled: true,
        })
      })
    })
    return lines
  }, [currentJob])

  const [orderLines, setOrderLines] = useState(() => initialLines)

  function toggleLine(id) {
    setOrderLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    )
  }

  function setLineQty(id, qty) {
    setOrderLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty } : l))
    )
  }

  const enabledLines = orderLines.filter((l) => l.enabled)
  const orderTotal = enabledLines.reduce((s, l) => s + l.cost_price * l.qty, 0)
  const supplierName = supplier?.name || settings?.supplier_name || 'Joinery Hardware NZ'
  const supplierEmail = supplier?.email || settings?.supplier_email || ''

  const resolvedAddress =
    collectionMethod === 'delivery'
      ? deliverySource === 'business' ? (settings?.home_base_address || '')
        : deliverySource === 'job' ? (currentJob?.customer_address || '')
        : customAddress
      : ''

  const poNumber = currentJob ? `PO-${currentJob.id.substring(0, 8).toUpperCase()}` : ''

  function buildPoArgs() {
    return {
      job: currentJob,
      settings: { ...settings, supplier_name: supplierName },
      orderLines: enabledLines,
      collectionMethod,
      deliveryAddress: resolvedAddress,
      logoUrl: settings.logo_url || null,
    }
  }

  function applyJobUpdate() {
    setCurrentJob((prev) => ({
      ...prev,
      status: 'ordered',
      po_collection_method: collectionMethod,
      po_delivery_address: resolvedAddress,
    }))
  }

  async function sendPo(toEmail) {
    const displayName = (settings.trading_name || settings.business_name || '').trim()
    if (!displayName) {
      setSendError('Add your business name in settings before sending purchase orders.')
      setPhase('error')
      return
    }
    setConfirmOpen(false)
    setPhase('sending')
    setSendError('')
    try {
      const blob = await generatePoPdf(buildPoArgs())
      const base64 = await blobToBase64(blob)
      const res = await fetch('/api/send-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_base64: base64,
          filename: `${poNumber}.pdf`,
          supplier_email: toEmail,
          supplier_name: supplierName,
          po_number: poNumber,
          collection_method: collectionMethod,
          delivery_address: resolvedAddress,
          business_name: settings.trading_name || settings.business_name,
          business_email: settings.business_email || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Send failed')
      if (saveEmailToSupplier && supplier?.id) {
        await updateSupplier(supplier.id, { email: toEmail })
      }
      applyJobUpdate()
      setSendOutcome({ type: 'emailed', email: toEmail })
      setPhase('done')
    } catch (err) {
      setSendError(err.message || 'Could not send the purchase order.')
      setPhase('error')
    }
  }

  async function downloadPo() {
    setConfirmOpen(false)
    setPhase('sending')
    try {
      const blob = await generatePoPdf(buildPoArgs())
      downloadBlob(blob, `${poNumber}.pdf`)
    } catch (err) {
      console.error('PO generation failed:', err)
    }
    applyJobUpdate()
    setSendOutcome({ type: 'downloaded' })
    setPhase('done')
  }

  // ── Phase screens ─────────────────────────────────────────────────────────────

  if (phase === 'sending') {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <p className="text-body text-aq-muted">Sending...</p>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="max-w-[480px] w-full mx-auto">
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-2xl mb-aq-lg text-center">
            {sendOutcome?.type === 'emailed' ? (
              <>
                <p className="text-section font-medium text-aq-ink mb-aq-sm">Purchase order sent.</p>
                <p className="text-body text-aq-muted">
                  Emailed to {supplierName} at {sendOutcome.email}.
                </p>
              </>
            ) : (
              <>
                <p className="text-section font-medium text-aq-ink mb-aq-sm">Purchase order downloaded.</p>
                <p className="text-body text-aq-muted">Send it to {supplierName} to complete the order.</p>
              </>
            )}
          </div>
          <Button variant="primary" fullWidth onClick={() => router.push(`/jobs/${params.id}`)}>
            Go to job
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="max-w-[480px] w-full mx-auto">
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-2xl mb-aq-lg text-center">
            <p className="text-section font-medium text-aq-ink mb-aq-sm">Could not send the purchase order.</p>
            <p className="text-body text-aq-muted">{sendError}</p>
          </div>
          <div className="flex flex-col gap-aq-sm">
            <Button
              variant="primary"
              fullWidth
              onClick={() => { setPhase('review'); setConfirmOpen(true) }}
            >
              Try again
            </Button>
            <Button variant="secondary" fullWidth onClick={downloadPo}>
              Download PDF instead
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center">
        <p className="text-body text-aq-muted">Loading...</p>
      </div>
    )
  }

  if (orderLines.length === 0) {
    return (
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">
          <div className="flex items-center gap-aq-sm py-aq-xl">
            <BackButton onClick={() => router.push(`/jobs/${params.id}`)} label="Job detail" />
            <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Order parts</h1>
          </div>
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-xl text-center">
            <p className="text-secondary text-aq-muted">No parts on this job to order.</p>
          </div>
        </div>
      </div>
    )
  }

  const sendToEmail = supplierEmail || emailInput.trim()

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-32">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton onClick={() => router.push(`/jobs/${params.id}`)} label="Job detail" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Order parts</h1>
        </div>

        <p className="text-secondary text-aq-muted mb-aq-lg">
          Review the parts below. Toggle off anything you already have in stock.
        </p>

        {/* Parts list */}
        <div className="flex flex-col gap-[10px] mb-aq-lg">
          {orderLines.map((line) => (
            <div
              key={line.id}
              className={`bg-white border rounded-aq-xl p-aq-lg transition-colors duration-150 ${
                line.enabled ? 'border-aq-border' : 'border-aq-border opacity-50'
              }`}
            >
              <div className="flex items-start gap-aq-md mb-aq-md">
                <ToggleSwitch on={line.enabled} onChange={() => toggleLine(line.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-aq-ink leading-snug">{line.name}</p>
                  <p className="text-caption text-aq-muted mt-aq-xs">
                    {line.supplier_code || line.sku || ''}
                  </p>
                  <p className="text-body font-medium text-aq-ink mt-aq-xs">
                    {formatCurrency(line.cost_price)}{' '}
                    <span className="text-caption text-aq-subtle font-normal">cost price</span>
                  </p>
                </div>
              </div>

              {line.enabled && (
                <div className="flex items-center justify-between">
                  <Stepper
                    value={line.qty}
                    onChange={(v) => setLineQty(line.id, v)}
                    min={1}
                    max={99}
                  />
                  <p className="text-body font-medium text-aq-ink">
                    {formatCurrency(line.cost_price * line.qty)}
                  </p>
                </div>
              )}

              {!line.enabled && (
                <div className="flex items-center justify-between">
                  <span className="text-secondary text-aq-subtle">Excluded from order</span>
                  <p className="text-secondary text-aq-subtle">{formatCurrency(0)}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <p className="text-body font-medium text-aq-ink mb-aq-md">Order summary</p>
          <div className="flex justify-between mb-aq-sm">
            <span className="text-secondary text-aq-muted">Items</span>
            <span className="text-secondary text-aq-ink">{enabledLines.length}</span>
          </div>
          <div className="flex justify-between mb-aq-sm">
            <span className="text-secondary text-aq-muted">Supplier</span>
            <span className="text-secondary text-aq-ink">{supplierName}</span>
          </div>
          <div className="h-px bg-aq-border my-aq-md" />
          <div className="flex justify-between">
            <span className="text-body font-medium text-aq-ink">Order total (excl. GST)</span>
            <span className="text-body font-medium text-aq-ink">{formatCurrency(orderTotal)}</span>
          </div>
        </div>

        {/* Collection method */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <p className="text-body font-medium text-aq-ink mb-aq-md">Collection method</p>
          <div className="flex gap-aq-sm mb-aq-md">
            {['pickup', 'delivery'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setCollectionMethod(method)}
                className={`min-h-tap flex-1 text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                  collectionMethod === method
                    ? 'border-aq-green bg-aq-green-tint text-aq-green'
                    : 'border-aq-border text-aq-muted bg-white'
                }`}
              >
                {method === 'pickup' ? 'Pickup' : 'Delivery'}
              </button>
            ))}
          </div>

          {collectionMethod === 'delivery' && (
            <div className="flex flex-col gap-aq-sm">
              {settings?.home_base_address && (
                <button
                  type="button"
                  onClick={() => setDeliverySource('business')}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border text-left transition-colors duration-150 ${
                    deliverySource === 'business'
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border text-aq-muted bg-white'
                  }`}
                >
                  Business address
                </button>
              )}
              {currentJob?.customer_address && (
                <button
                  type="button"
                  onClick={() => setDeliverySource('job')}
                  className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border text-left transition-colors duration-150 ${
                    deliverySource === 'job'
                      ? 'border-aq-green bg-aq-green-tint text-aq-green'
                      : 'border-aq-border text-aq-muted bg-white'
                  }`}
                >
                  Job address
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeliverySource('custom')}
                className={`min-h-tap px-aq-lg text-secondary font-medium rounded-aq-lg border text-left transition-colors duration-150 ${
                  deliverySource === 'custom'
                    ? 'border-aq-green bg-aq-green-tint text-aq-green'
                    : 'border-aq-border text-aq-muted bg-white'
                }`}
              >
                Other address
              </button>

              {deliverySource === 'custom' && (
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="Enter delivery address"
                  className={inputClass}
                />
              )}

              {resolvedAddress && (
                <p className="text-secondary text-aq-ink px-aq-xs">{resolvedAddress}</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-aq-border px-aq-lg py-aq-md">
        <div className="max-w-[480px] mx-auto">
          <Button
            variant="primary"
            fullWidth
            disabled={enabledLines.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            Send purchase order
          </Button>
        </div>
      </div>

      {/* ── Confirm + send modal ─────────────────────────────────────────────── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-aq-xl"
          style={{ backgroundColor: 'rgba(31, 45, 55, 0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-aq-xl p-aq-xl w-full max-w-sm shadow-lg">
            <p className="text-body font-medium text-aq-ink mb-aq-xs">
              Send purchase order to {supplierName}?
            </p>
            <p className="text-secondary text-aq-muted mb-aq-lg">
              {formatCurrency(orderTotal)} excl. GST
            </p>

            {supplierEmail ? (
              <p className="text-secondary text-aq-muted mb-aq-lg">
                Sending to: {supplierEmail}
              </p>
            ) : (
              <div className="mb-aq-lg">
                <label htmlFor="supplier-email" className="block text-secondary text-aq-muted mb-aq-sm">
                  Supplier email
                </label>
                <input
                  id="supplier-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. orders@supplier.co.nz"
                  className={inputClass}
                  autoFocus
                />
                {emailInput.trim() && supplier?.id && (
                  <label className="flex items-center gap-aq-sm mt-aq-sm min-h-tap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveEmailToSupplier}
                      onChange={(e) => setSaveEmailToSupplier(e.target.checked)}
                      className="w-5 h-5 accent-[#22A67A]"
                    />
                    <span className="text-secondary text-aq-muted">Save email for {supplierName}</span>
                  </label>
                )}
              </div>
            )}

            <div className="flex flex-col gap-aq-sm">
              <button
                type="button"
                disabled={!sendToEmail}
                onClick={() => sendPo(sendToEmail)}
                className={btnPrimary}
              >
                Send by email
              </button>
              <button type="button" onClick={downloadPo} className={btnSecondary}>
                Download PDF instead
              </button>
              <button type="button" onClick={() => setConfirmOpen(false)} className={btnGhost}>
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
