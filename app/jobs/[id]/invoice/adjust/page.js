'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import BackButton from '@/components/BackButton'
import Button from '@/components/Button'
import Stepper from '@/components/Stepper'
import { formatCurrency, calcGst } from '@/lib/pricing'

export default function InvoiceAdjustPage() {
  const params = useParams()
  const router = useRouter()
  const { jobs, currentJob, setCurrentJob, selectJob } = useJob()
  const { settings } = useSettings()

  useEffect(() => {
    const match = jobs.find((j) => j.id === params.id)
    if (match) selectJob(params.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const [labourHours, setLabourHours] = useState(0)
  const [calloutFee, setCalloutFee] = useState(0)
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (currentJob && !initialised) {
      const saved = currentJob.labour_hours
      setLabourHours(saved != null ? saved : 0)
      setCalloutFee(currentJob.callout_fee || 0)
      setInitialised(true)
    }
  }, [currentJob, initialised])

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <p className="text-body text-aq-muted">Loading...</p>
      </div>
    )
  }

  const hourlyRate = currentJob.hourly_rate || settings.hourly_labour_rate || 0
  const gstRate = settings.gst_rate || 15
  const items = currentJob.items || []
  const zones = settings.callout_zones || []

  const partsSell = items.flatMap((i) => i.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourSell = labourHours * hourlyRate
  const subtotal = partsSell + labourSell + calloutFee
  const gst = calcGst(subtotal, gstRate)
  const total = subtotal + gst

  function handleSave() {
    setCurrentJob((prev) => ({
      ...prev,
      labour_hours: labourHours,
      callout_fee: calloutFee,
    }))
    router.push(`/jobs/${params.id}/invoice`)
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[80px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href={`/jobs/${params.id}/invoice`} label="Invoice" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Adjust</h1>
        </div>

        <div className="flex flex-col gap-aq-lg">

          {/* Labour */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <h2 className="text-section font-medium text-aq-ink mb-aq-md">Labour</h2>
            <Stepper
              value={labourHours}
              onChange={setLabourHours}
              min={0}
              step={0.5}
              formatValue={(v) => v === 0 ? 'No labour' : `${v} hr`}
            />
            {labourHours > 0 && (
              <p className="text-secondary text-aq-muted mt-aq-sm">
                {labourHours} hr @ {formatCurrency(hourlyRate)}/hr = {formatCurrency(labourSell)}
              </p>
            )}
          </div>

          {/* Callout zones */}
          {zones.length > 0 && (
            <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
              <h2 className="text-section font-medium text-aq-ink mb-aq-md">Callout fee</h2>
              <div className="flex flex-col gap-aq-sm">
                <button
                  type="button"
                  onClick={() => setCalloutFee(0)}
                  className={`flex justify-between items-center w-full min-h-tap px-aq-md rounded-aq-lg border text-secondary transition-colors ${
                    calloutFee === 0
                      ? 'border-aq-green bg-aq-green-tint text-aq-green font-medium'
                      : 'border-aq-border bg-white text-aq-ink'
                  }`}
                >
                  <span>No callout</span>
                  <span>{formatCurrency(0)}</span>
                </button>
                {zones.map((zone) => (
                  <button
                    key={zone.id || zone.name}
                    type="button"
                    onClick={() => setCalloutFee(zone.fee)}
                    className={`flex justify-between items-center w-full min-h-tap px-aq-md rounded-aq-lg border text-secondary transition-colors ${
                      calloutFee === zone.fee
                        ? 'border-aq-green bg-aq-green-tint text-aq-green font-medium'
                        : 'border-aq-border bg-white text-aq-ink'
                    }`}
                  >
                    <span>{zone.name}</span>
                    <span>{formatCurrency(zone.fee)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items read-only */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <div className="flex items-center justify-between mb-aq-md">
              <h2 className="text-section font-medium text-aq-ink">Items</h2>
              <Link
                href={`/jobs/${params.id}/items`}
                className="text-secondary font-medium text-aq-green min-h-tap flex items-center"
                style={{ textDecoration: 'none' }}
              >
                Edit
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="text-secondary text-aq-muted">No items added.</p>
            ) : (
              <div className="flex flex-col gap-aq-xs">
                {items.map((item) => (
                  <p key={item.id} className="text-secondary text-aq-ink">
                    {item.type === 'custom'
                      ? (item.description || 'Custom item')
                      : [item.joinery_type_label, item.fault_label].filter(Boolean).join(' - ')}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Running total */}
          <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg">
            <div className="flex justify-between items-baseline">
              <span className="text-body font-medium text-aq-green">Total inc. GST</span>
              <span className="text-display font-medium text-aq-green" style={{ lineHeight: 1.1 }}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <Button variant="primary" fullWidth onClick={handleSave}>
            Save and review
          </Button>

        </div>
      </div>
    </div>
  )
}
