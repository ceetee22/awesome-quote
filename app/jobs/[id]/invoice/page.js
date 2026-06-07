'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import BackButton from '@/components/BackButton'
import Button from '@/components/Button'
import { formatCurrency, calcGst } from '@/lib/pricing'
import { getRoomColour } from '@/lib/rooms'
import { JOB_SOURCE } from '@/lib/constants'

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { jobs, currentJob, setCurrentJob, selectJob } = useJob()
  const { settings } = useSettings()

  useEffect(() => {
    const match = jobs.find((j) => j.id === params.id)
    if (match) selectJob(params.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <p className="text-body text-aq-muted">Loading...</p>
      </div>
    )
  }

  const hourlyRate = currentJob.hourly_rate || settings.hourly_labour_rate || 0
  const labourHours = currentJob.labour_hours || 0
  const calloutFee = currentJob.callout_fee || 0
  const gstRate = settings.gst_rate || 15
  const items = currentJob.items || []

  const partsSell = items.flatMap((i) => i.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourSell = labourHours * hourlyRate
  const subtotal = partsSell + labourSell + calloutFee
  const gst = calcGst(subtotal, gstRate)
  const total = subtotal + gst

  // Group items by room
  const roomMap = {}
  for (const item of items) {
    const room = item.room_name || 'Other'
    if (!roomMap[room]) roomMap[room] = []
    roomMap[room].push(item)
  }
  const rooms = Object.entries(roomMap)

  function itemDescription(item) {
    if (item.type === 'custom') return item.description || 'Custom item'
    return [item.joinery_type_label, item.fault_label].filter(Boolean).join(' - ')
  }

  function itemSellTotal(item) {
    return (item.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0)
  }

  function handlePaidNow() {
    const now = new Date().toISOString()
    setCurrentJob((prev) => ({
      ...prev,
      status: 'invoiced',
      invoiced_at: now,
      payment_status: 'paid',
      paid_at: now,
    }))
    router.push(`/jobs/${params.id}`)
  }

  function handleInvoiced() {
    setCurrentJob((prev) => ({
      ...prev,
      status: 'invoiced',
      invoiced_at: new Date().toISOString(),
    }))
    router.push(`/jobs/${params.id}`)
  }

  function handleLater() {
    router.push(`/jobs/${params.id}`)
  }

  const source = currentJob.source

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[80px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href={`/jobs/${params.id}`} label="Job" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Invoice</h1>
        </div>

        <div className="flex flex-col gap-aq-lg">

          {/* Customer + total */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <p className="text-body font-medium text-aq-ink">{currentJob.customer_name}</p>
            {currentJob.customer_address && (
              <p className="text-secondary text-aq-muted mt-aq-xs">{currentJob.customer_address}</p>
            )}
            <p className="text-display font-medium text-aq-green mt-aq-md" style={{ lineHeight: 1.1 }}>
              {formatCurrency(total)}
            </p>
            <p className="text-caption text-aq-muted mt-aq-xs">inc. GST</p>
          </div>

          {/* Items by room */}
          {rooms.length > 0 && (
            <div className="bg-white border border-aq-border rounded-aq-xl overflow-hidden">
              {rooms.map(([roomName, roomItems], ri) => (
                <div key={roomName}>
                  {ri > 0 && <div style={{ borderTop: '1px solid #F0F2F1' }} />}
                  <div style={{ padding: '12px 16px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 14, borderRadius: 2, background: getRoomColour(roomName), flexShrink: 0 }} />
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#8CA3A0', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{roomName}</p>
                    </div>
                  </div>
                  {roomItems.map((item, ii) => (
                    <div key={item.id} style={{
                      padding: '8px 16px',
                      borderTop: ii === 0 ? 'none' : '1px solid #F6F8F7',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                    }}>
                      <p style={{ fontSize: 15, color: '#1F2D37', margin: 0, flex: 1 }}>{itemDescription(item)}</p>
                      {itemSellTotal(item) > 0 && (
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#1F2D37', margin: 0, flexShrink: 0 }}>
                          {formatCurrency(itemSellTotal(item))}
                        </p>
                      )}
                    </div>
                  ))}
                  {ri === rooms.length - 1 && <div style={{ height: 12 }} />}
                </div>
              ))}
            </div>
          )}

          {/* Pricing breakdown */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <div className="flex items-center justify-between mb-aq-md">
              <h2 className="text-section font-medium text-aq-ink">Total</h2>
              <Link
                href={`/jobs/${params.id}/invoice/adjust`}
                className="text-secondary font-medium text-aq-green min-h-tap flex items-center"
                style={{ textDecoration: 'none' }}
              >
                Adjust
              </Link>
            </div>
            <div className="flex flex-col gap-aq-sm">
              {labourHours > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">
                    Labour ({labourHours} hr @ {formatCurrency(hourlyRate)}/hr)
                  </span>
                  <span className="text-secondary text-aq-ink font-medium">{formatCurrency(labourSell)}</span>
                </div>
              )}
              {calloutFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">Callout fee</span>
                  <span className="text-secondary text-aq-ink font-medium">{formatCurrency(calloutFee)}</span>
                </div>
              )}
              {partsSell > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">Parts</span>
                  <span className="text-secondary text-aq-ink font-medium">{formatCurrency(partsSell)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid #E4EAE8', paddingTop: 8, marginTop: 4 }}>
                <div className="flex justify-between">
                  <span className="text-secondary text-aq-muted">GST ({gstRate}%)</span>
                  <span className="text-secondary text-aq-ink">{formatCurrency(gst)}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-body font-medium text-aq-ink">Total</span>
                <span className="text-body font-medium text-aq-green">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment fork */}
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <h2 className="text-section font-medium text-aq-ink mb-aq-md">Payment</h2>
            <div className="flex flex-col gap-aq-sm">
              {source === JOB_SOURCE.DIRECT ? (
                <>
                  <Button variant="primary" fullWidth onClick={handlePaidNow}>
                    Paid - cash or card
                  </Button>
                  <Button variant="secondary" fullWidth onClick={handleInvoiced}>
                    Invoice on terms
                  </Button>
                  <Button variant="secondary" fullWidth onClick={handleLater}>
                    Do later
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" fullWidth onClick={handleInvoiced}>
                    Mark as invoiced
                  </Button>
                  <Button variant="secondary" fullWidth onClick={handleLater}>
                    Do later
                  </Button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
