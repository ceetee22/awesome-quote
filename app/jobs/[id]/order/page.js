'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { getDefaultSupplier } from '@/lib/db'
import { formatCurrency } from '@/lib/pricing'
import { generatePoPdf } from '@/lib/generate-po-pdf'
import { downloadBlob } from '@/lib/generate-quote-pdf'
import BackButton from '@/components/BackButton'
import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import Stepper from '@/components/Stepper'

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

  const [phase, setPhase] = useState('review') // review | generating | done
  const [supplier, setSupplier] = useState(null)
  const [collectionMethod, setCollectionMethod] = useState('pickup')
  const [deliverySource, setDeliverySource] = useState('business')
  const [customAddress, setCustomAddress] = useState('')

  useEffect(() => {
    getDefaultSupplier().then(setSupplier)
  }, [])

  // Build order lines from all parts across all job items
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
  const [confirmOpen, setConfirmOpen] = useState(false)

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

  async function handleConfirm() {
    setConfirmOpen(false)
    setPhase('generating')
    try {
      const blob = await generatePoPdf({
        job: currentJob,
        settings: { ...settings, supplier_name: supplierName, supplier_email: supplierEmail },
        orderLines: enabledLines,
        collectionMethod,
        deliveryAddress: resolvedAddress,
      })
      const poNumber = `PO-${(currentJob.id || '').substring(0, 8).toUpperCase()}`
      downloadBlob(blob, `${poNumber}.pdf`)
      setCurrentJob((prev) => ({
        ...prev,
        status: 'ordered',
        po_collection_method: collectionMethod,
        po_delivery_address: resolvedAddress,
      }))
      setPhase('done')
    } catch {
      setPhase('review')
    }
  }

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center">
        <p className="text-body text-aq-muted">Loading...</p>
      </div>
    )
  }

  // Done phase
  if (phase === 'done') {
    return (
      <div className="min-h-dvh bg-aq-surface">
        <div className="max-w-[480px] mx-auto px-aq-lg pb-aq-2xl">
          <div className="flex items-center gap-aq-sm py-aq-xl">
            <h1 className="text-page-title font-medium text-aq-ink">Order placed</h1>
          </div>
          <div className="bg-aq-green-tint border border-aq-green rounded-aq-xl p-aq-xl mb-aq-lg text-center">
            <p className="text-body font-medium text-aq-ink mb-aq-xs">Purchase order downloaded</p>
            <p className="text-secondary text-aq-muted">Email it to your supplier to complete the order.</p>
          </div>
          <Button variant="primary" fullWidth onClick={() => router.push(`/jobs/${params.id}`)}>
            Go to job
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
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
                  className="w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors"
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
            disabled={enabledLines.length === 0 || phase === 'generating'}
            onClick={() => setConfirmOpen(true)}
          >
            {phase === 'generating' ? 'Generating...' : 'Send purchase order'}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        question={`Send purchase order to ${supplierName} for ${formatCurrency(orderTotal)}?`}
        detail={
          collectionMethod === 'pickup'
            ? 'This will download a PO PDF. Marked for pickup.'
            : `This will download a PO PDF. Deliver to ${resolvedAddress || 'the address selected'}.`
        }
        confirmLabel="Yes, send"
        cancelLabel="Not yet"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
