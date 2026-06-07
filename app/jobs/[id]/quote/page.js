'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency, calcGst } from '@/lib/pricing'
import { JOB_SOURCE, JOB_SOURCE_LABELS } from '@/lib/constants'
import { generateQuotePdf, downloadBlob } from '@/lib/generate-quote-pdf'
import { trackTemplateUsage } from '@/lib/db'
import { getRoomColour } from '@/lib/rooms'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import Stepper from '@/components/Stepper'

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

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
        _roomId: item.room_id || null,
        _roomName: item.room_name || null,
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
    if (saved != null) return saved
    return 0
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

  const [parkingNoteShown, setParkingNoteShown] = useState(() => currentJob?.parking_note_shown ?? true)

  const [customerName, setCustomerName] = useState(currentJob?.customer_name || '')
  const [customerAddress, setCustomerAddress] = useState(currentJob?.customer_address || '')
  const [customerPhone, setCustomerPhone] = useState(currentJob?.customer_phone || '')
  const [customerEmail, setCustomerEmail] = useState(currentJob?.customer_email || '')
  const [source, setSource] = useState(currentJob?.source || JOB_SOURCE.DIRECT)

  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendPhase, setSendPhase] = useState(null) // null | 'sending' | 'done' | 'error'
  const [sendOutcome, setSendOutcome] = useState(null) // { type: 'emailed', email } | { type: 'downloaded' }
  const [sendError, setSendError] = useState('')

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

  const [dismissedSavePrompts, setDismissedSavePrompts] = useState(new Set())
  const [savedSavePrompts, setSavedSavePrompts] = useState(new Set())

  function groupPartsByItem(parts) {
    const map = new Map()
    for (const p of parts) {
      if (!map.has(p._itemId)) map.set(p._itemId, { label: p._itemLabel, parts: [] })
      map.get(p._itemId).parts.push(p)
    }
    return [...map.entries()].map(([itemId, g]) => ({ itemId, ...g }))
  }

  const groupedQuoteParts = groupPartsByItem(quoteParts)

  const hasRoomsInParts = quoteParts.some((p) => p._roomId)

  const partsGroupedByRoom = (() => {
    if (!hasRoomsInParts) return null
    const roomOrder = (currentJob?.rooms || []).map((r) => r.id)
    const byRoom = new Map()
    const noRoom = []
    for (const p of quoteParts) {
      if (!p._roomId) { noRoom.push(p); continue }
      if (!byRoom.has(p._roomId)) byRoom.set(p._roomId, { name: p._roomName || 'Room', parts: [] })
      byRoom.get(p._roomId).parts.push(p)
    }
    const ordered = []
    for (const id of roomOrder) {
      if (byRoom.has(id)) ordered.push({ roomId: id, name: byRoom.get(id).name, parts: byRoom.get(id).parts })
    }
    for (const [id, room] of byRoom) {
      if (!roomOrder.includes(id)) ordered.push({ roomId: id, name: room.name, parts: room.parts })
    }
    return { noRoom, rooms: ordered }
  })()

  const templatePrompts = (() => {
    if (!currentJob) return []
    const seen = new Set()
    const prompts = []
    for (const item of (currentJob.items || [])) {
      if (item.type !== 'diagnosed') continue
      const key = `${item.joinery_type}::${item.fault}`
      if (seen.has(key)) continue
      seen.add(key)
      prompts.push({
        key,
        joinery_type: item.joinery_type,
        joinery_type_label: item.joinery_type_label,
        fault: item.fault,
        fault_label: item.fault_label,
        hasTemplate: !!item.template_id,
        parts: item.parts || [],
      })
    }
    return prompts
  })()

  const partsSubtotal = quoteParts.reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourTotal = labourHours * hourlyRate
  const subtotal = partsSubtotal + labourTotal + calloutFee
  const gst = calcGst(subtotal, GST_RATE)
  const total = subtotal + gst

  const newVersion = (currentJob?.quote_version || 1) + 1

  const acceptanceUrl = `https://www.jotey.co.nz/accept/${params.id}`

  function buildPdfArgs(extra = {}) {
    return {
      job: currentJob,
      settings,
      labourHours,
      calloutFee,
      hourlyRate,
      subtotal,
      gst,
      total,
      acceptanceUrl,
      logoUrl: settings.logo_url || null,
      parkingNoteShown,
      ...extra,
    }
  }

  function buildSafeName() {
    return `quote-${(currentJob?.customer_name || 'quote').replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
  }

  function baseJobUpdates() {
    return {
      status: 'quoted',
      labour_hours: labourHours,
      callout_fee: calloutFee,
      hourly_rate: hourlyRate,
      parking_note_shown: parkingNoteShown,
      customer_name: customerName.trim(),
      customer_address: customerAddress.trim(),
      customer_phone: customerPhone.trim(),
      source,
    }
  }

  function handleAcceptNow() {
    setCurrentJob((prev) => prev ? { ...prev, ...baseJobUpdates(), status: 'accepted', schedule_state: 'unassigned' } : prev)
    router.push(`/jobs/${params.id}`)
  }

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

  // ── Email send ───────────────────────────────────────────────────────────────

  async function sendByEmail({ email, pdfArgs, filename, jobUpdates }) {
    const displayName = (settings.trading_name || settings.business_name || '').trim()
    if (!displayName) {
      setSendError('Add your business name in settings before sending quotes.')
      setSendPhase('error')
      return
    }
    setSendPhase('sending')
    setSendError('')
    try {
      const blob = await generateQuotePdf(pdfArgs)
      const base64 = await blobToBase64(blob)
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_base64: base64,
          filename,
          customer_email: email,
          customer_name: customerName.trim() || currentJob.customer_name,
          accept_url: acceptanceUrl,
          business_name: settings.trading_name || settings.business_name,
          business_email: settings.business_email || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setCurrentJob((prev) => prev ? { ...prev, ...jobUpdates, customer_email: email } : prev)
      setCustomerEmail(email)
      setSendOutcome({ type: 'emailed', email })
      // Track template usage for all pre-filled templates in this job
      ;(currentJob?.items || []).forEach((item) => {
        if (item.template_id) trackTemplateUsage(item.template_id)
      })
      setSendPhase('done')
    } catch (err) {
      setSendError(err.message || 'Could not send the email. Check the address and try again.')
      setSendPhase('error')
    }
  }

  async function downloadPdf({ pdfArgs, filename, jobUpdates }) {
    setSendPhase('sending')
    try {
      const blob = await generateQuotePdf(pdfArgs)
      downloadBlob(blob, filename)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setCurrentJob((prev) => prev ? { ...prev, ...jobUpdates } : prev)
    setSendOutcome({ type: 'downloaded' })
    setSendPhase('done')
  }

  // ── Normal send handlers ─────────────────────────────────────────────────────

  function handleSendByEmail(email) {
    setSendModalOpen(false)
    sendByEmail({
      email,
      pdfArgs: buildPdfArgs(),
      filename: `${buildSafeName()}.pdf`,
      jobUpdates: baseJobUpdates(),
    })
  }

  function handleDownloadFallback() {
    setSendModalOpen(false)
    downloadPdf({
      pdfArgs: buildPdfArgs(),
      filename: `${buildSafeName()}.pdf`,
      jobUpdates: baseJobUpdates(),
    })
  }

  // ── Revise handlers ──────────────────────────────────────────────────────────

  function handleReviseByEmail(email) {
    setReviseModalOpen(false)
    sendByEmail({
      email,
      pdfArgs: buildPdfArgs({ quoteVersion: newVersion, isRevision: true }),
      filename: `${buildSafeName()}-v${newVersion}.pdf`,
      jobUpdates: {
        ...baseJobUpdates(),
        quote_version: newVersion,
        previous_total: originalTotal,
        revision_note: reviseNote || null,
      },
    })
  }

  function handleReviseDownloadFallback() {
    setReviseModalOpen(false)
    downloadPdf({
      pdfArgs: buildPdfArgs({ quoteVersion: newVersion, isRevision: true }),
      filename: `${buildSafeName()}-v${newVersion}.pdf`,
      jobUpdates: {
        ...baseJobUpdates(),
        quote_version: newVersion,
        previous_total: originalTotal,
        revision_note: reviseNote || null,
      },
    })
  }

  function handleSaveDraft() {
    setCurrentJob((prev) =>
      prev ? { ...prev, status: 'draft', labour_hours: labourHours, callout_fee: calloutFee, hourly_rate: hourlyRate, parking_note_shown: parkingNoteShown } : prev
    )
    router.push('/')
  }

  // ── Phase screens ────────────────────────────────────────────────────────────

  if (sendPhase === 'sending') {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <p className="text-body text-aq-muted">Sending...</p>
      </div>
    )
  }

  if (sendPhase === 'done') {
    const visiblePrompts = templatePrompts.filter(
      (p) => !dismissedSavePrompts.has(p.key) && !savedSavePrompts.has(p.key)
    )

    async function handleSaveTemplate(prompt) {
      try {
        await fetch('/api/repair-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            joinery_type: prompt.joinery_type,
            fault: prompt.fault,
            labour_minutes: Math.round(labourHours * 60),
            parts: prompt.parts.map((p) => ({
              part_id: p.part_id,
              name: p.name,
              sell_price: p.sell_price,
              qty: p.qty,
            })),
          }),
        })
      } catch {}
      setSavedSavePrompts((prev) => new Set([...prev, prompt.key]))
    }

    return (
      <div className="min-h-dvh bg-aq-surface px-aq-lg py-aq-xl">
        <div className="max-w-[480px] w-full mx-auto">
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-2xl mb-aq-lg text-center">
            {sendOutcome?.type === 'emailed' ? (
              <>
                <p className="text-section font-medium text-aq-ink mb-aq-sm">Quote sent.</p>
                <p className="text-body text-aq-muted">Emailed to {sendOutcome.email}.</p>
              </>
            ) : (
              <>
                <p className="text-section font-medium text-aq-ink mb-aq-sm">Quote downloaded.</p>
                <p className="text-body text-aq-muted">Email it to {currentJob?.customer_name}.</p>
              </>
            )}
          </div>

          {/* Save-as-standard prompts */}
          {visiblePrompts.map((prompt) => (
            <div
              key={prompt.key}
              style={{
                background: prompt.hasTemplate ? '#FFFFFF' : '#FEF7E6',
                border: `1px solid ${prompt.hasTemplate ? '#E4EAE8' : '#F5D98A'}`,
                borderRadius: 16,
                padding: '16px',
                marginBottom: 12,
              }}
            >
              <p className="text-body font-medium text-aq-ink mb-aq-xs">
                {prompt.hasTemplate
                  ? `Update your standard for ${prompt.joinery_type_label} - ${prompt.fault_label}?`
                  : 'Save as your standard rate?'}
              </p>
              <p className="text-secondary text-aq-muted mb-aq-md">
                {prompt.hasTemplate
                  ? 'Replaces the saved parts and labour with what you used today.'
                  : `${prompt.joinery_type_label} - ${prompt.fault_label}. Pre-fills next time.`}
              </p>
              <div className="flex gap-aq-sm">
                <button
                  type="button"
                  onClick={() => handleSaveTemplate(prompt)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    fontSize: 15,
                    fontWeight: 500,
                    borderRadius: 12,
                    background: prompt.hasTemplate ? '#F5F7F6' : '#FBE8A6',
                    border: `1px solid ${prompt.hasTemplate ? '#E4EAE8' : '#F5D98A'}`,
                    color: '#1F2D37',
                    cursor: 'pointer',
                  }}
                >
                  {prompt.hasTemplate ? 'Update' : 'Save standard'}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedSavePrompts((prev) => new Set([...prev, prompt.key]))}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    fontSize: 15,
                    fontWeight: 500,
                    borderRadius: 12,
                    background: 'transparent',
                    border: '1px solid #E4EAE8',
                    color: '#8CA3A0',
                    cursor: 'pointer',
                  }}
                >
                  {prompt.hasTemplate ? 'Keep current' : 'Not now'}
                </button>
              </div>
            </div>
          ))}

          <Button variant="primary" fullWidth onClick={() => router.replace(`/jobs/${params.id}`)}>
            Go to job
          </Button>
        </div>
      </div>
    )
  }

  if (sendPhase === 'error') {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="max-w-[480px] w-full mx-auto">
          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-2xl mb-aq-lg text-center">
            <p className="text-section font-medium text-aq-ink mb-aq-sm">Could not send the email.</p>
            <p className="text-body text-aq-muted">Check the address and try again.</p>
          </div>
          <div className="flex flex-col gap-aq-sm">
            <Button variant="primary" fullWidth onClick={() => { setSendPhase(null); setSendModalOpen(true) }}>
              Try again
            </Button>
            <Button variant="secondary" fullWidth onClick={() => {
              setSendPhase(null)
              downloadPdf({
                pdfArgs: buildPdfArgs(),
                filename: `${buildSafeName()}.pdf`,
                jobUpdates: baseJobUpdates(),
              })
            }}>
              Download PDF instead
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentJob) {
    return (
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center px-aq-lg">
        <div className="text-center">
          <p className="text-body text-aq-muted mb-aq-lg">No job in progress.</p>
          <Button variant="primary" onClick={() => router.push('/')}>Go home</Button>
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
            onClick={() => router.back()}
            label="Back"
          />
          <div className="ml-aq-sm">
            <h1 className="text-page-title font-medium text-aq-ink">
              {isRevise ? `Revising quote (v${newVersion})` : 'Quote'}
            </h1>
            <p className="text-secondary text-aq-muted">Add customer details to send</p>
          </div>
        </div>

        {/* Customer details form */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <h2 className="text-section font-medium text-aq-ink mb-aq-md">Customer details</h2>
          <div className="flex flex-col gap-aq-md">
            <div>
              <label htmlFor="cust-name" className="block text-secondary text-aq-muted mb-aq-sm">Customer name</label>
              <input
                id="cust-name"
                type="text"
                autoComplete="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah Taufa"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="cust-addr" className="block text-secondary text-aq-muted mb-aq-sm">Address</label>
              <input
                id="cust-addr"
                type="text"
                autoComplete="street-address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="e.g. 14 Rata St, Papakura"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="cust-phone" className="block text-secondary text-aq-muted mb-aq-sm">
                Phone <span className="text-aq-subtle">(optional)</span>
              </label>
              <input
                id="cust-phone"
                type="tel"
                autoComplete="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 021 123 4567"
                className={inputClass}
              />
            </div>
            <div>
              <p className="text-secondary text-aq-muted mb-aq-sm">Job source</p>
              <div className="flex gap-aq-sm">
                {[JOB_SOURCE.DIRECT, JOB_SOURCE.PROPERTY_MANAGER, JOB_SOURCE.BUILDER].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={`flex-1 min-h-tap px-aq-md text-secondary font-medium rounded-aq-lg border transition-colors duration-150 ${
                      source === s ? 'border-aq-green text-aq-green bg-aq-green-tint' : 'border-aq-border text-aq-muted bg-white hover:bg-aq-surface'
                    }`}
                  >
                    {JOB_SOURCE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Parts breakdown */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <h2 className="text-section font-medium text-aq-ink mb-aq-md">Parts</h2>
          {quoteParts.length === 0 ? (
            <p className="text-secondary text-aq-muted mb-aq-md">No parts added.</p>
          ) : (
            <div className="mb-aq-md">
              {hasRoomsInParts ? (
                /* Room-grouped parts */
                <>
                  {partsGroupedByRoom.noRoom.length > 0 && (
                    <div className="mb-aq-md">
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#8CA3A0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Other</p>
                      <div className="border-t border-aq-border mb-aq-sm" />
                      {groupPartsByItem(partsGroupedByRoom.noRoom).map((group, gIdx) => {
                        const groupTotal = group.parts.reduce((s, p) => s + p.sell_price * p.qty, 0)
                        return (
                          <div key={group.itemId} className={gIdx > 0 ? 'mt-aq-md pt-aq-md border-t border-aq-border' : ''}>
                            <p className="text-caption font-medium text-aq-muted mb-aq-sm">{group.label}</p>
                            {group.parts.map((p) => (
                              <div key={p._key} className="flex items-center gap-aq-sm py-aq-sm border-b border-aq-border last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-secondary font-medium text-aq-ink leading-snug truncate">{p.name}</p>
                                  <p className="text-caption text-aq-subtle">x{p.qty} @ {formatCurrency(p.sell_price)}/{p.unit}</p>
                                </div>
                                <span className="text-secondary font-medium text-aq-ink shrink-0 w-[72px] text-right">{formatCurrency(p.sell_price * p.qty)}</span>
                                <button type="button" onClick={() => removePart(p._key)} className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-error hover:bg-aq-error-tint rounded-aq-md transition-colors" aria-label={`Remove ${p.name}`}><XIcon /></button>
                              </div>
                            ))}
                            <div className="flex justify-between items-baseline pt-aq-xs mt-aq-xs">
                              <span className="text-caption text-aq-muted">Item subtotal</span>
                              <span className="text-secondary font-medium text-aq-ink w-[72px] text-right">{formatCurrency(groupTotal)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {partsGroupedByRoom.rooms.map((room, rIdx) => (
                    <div key={room.roomId} className={rIdx > 0 || partsGroupedByRoom.noRoom.length > 0 ? 'mt-aq-md' : ''}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 4, height: 14, borderRadius: 2, background: getRoomColour(room.name), flexShrink: 0 }} />
                        <p style={{ fontSize: 10, fontWeight: 600, color: '#8CA3A0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{room.name}</p>
                      </div>
                      <div className="border-t border-aq-border mb-aq-sm" />
                      {groupPartsByItem(room.parts).map((group, gIdx) => {
                        const groupTotal = group.parts.reduce((s, p) => s + p.sell_price * p.qty, 0)
                        return (
                          <div key={group.itemId} className={gIdx > 0 ? 'mt-aq-md pt-aq-md border-t border-aq-border' : ''}>
                            <p className="text-caption font-medium text-aq-muted mb-aq-sm">{group.label}</p>
                            {group.parts.map((p) => (
                              <div key={p._key} className="flex items-center gap-aq-sm py-aq-sm border-b border-aq-border last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-secondary font-medium text-aq-ink leading-snug truncate">{p.name}</p>
                                  <p className="text-caption text-aq-subtle">x{p.qty} @ {formatCurrency(p.sell_price)}/{p.unit}</p>
                                </div>
                                <span className="text-secondary font-medium text-aq-ink shrink-0 w-[72px] text-right">{formatCurrency(p.sell_price * p.qty)}</span>
                                <button type="button" onClick={() => removePart(p._key)} className="min-h-tap min-w-[48px] flex items-center justify-center text-aq-error hover:bg-aq-error-tint rounded-aq-md transition-colors" aria-label={`Remove ${p.name}`}><XIcon /></button>
                              </div>
                            ))}
                            <div className="flex justify-between items-baseline pt-aq-xs mt-aq-xs">
                              <span className="text-caption text-aq-muted">Item subtotal</span>
                              <span className="text-secondary font-medium text-aq-ink w-[72px] text-right">{formatCurrency(groupTotal)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </>
              ) : (
                /* Flat / item-grouped parts (no rooms) */
                groupedQuoteParts.map((group, gIdx) => {
                  const groupTotal = group.parts.reduce((s, p) => s + p.sell_price * p.qty, 0)
                  return (
                    <div key={group.itemId} className={gIdx > 0 ? 'mt-aq-md pt-aq-md border-t border-aq-border' : ''}>
                      {groupedQuoteParts.length > 1 && (
                        <p className="text-caption font-medium text-aq-muted mb-aq-sm">{group.label}</p>
                      )}
                      {group.parts.map((p) => (
                        <div key={p._key} className="flex items-center gap-aq-sm py-aq-sm border-b border-aq-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-secondary font-medium text-aq-ink leading-snug truncate">{p.name}</p>
                            <p className="text-caption text-aq-subtle">x{p.qty} @ {formatCurrency(p.sell_price)}/{p.unit}</p>
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
                })
              )}
            </div>
          )}
          <Button variant="secondary" fullWidth onClick={() => router.push(`/jobs/${params.id}/items/add`)}>
            Add more parts
          </Button>
        </div>

        {/* Labour */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <div className="flex items-center justify-between mb-aq-md">
            <h2 className="text-section font-medium text-aq-ink">Labour</h2>
            <span className="text-body font-medium text-aq-ink">{formatCurrency(labourTotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-aq-md">
            <Stepper
              value={labourHours}
              onChange={setLabourHours}
              min={0}
              step={0.5}
              formatValue={(v) => v === 0 ? 'No labour' : `${v} hr`}
            />
            <span className="text-secondary text-aq-muted shrink-0">{formatCurrency(hourlyRate)}/hr</span>
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

          <p className="text-caption text-aq-muted mb-aq-sm">Manual override</p>
          <div className="flex items-stretch border border-aq-border rounded-aq-md overflow-hidden min-h-tap focus-within:border-aq-green transition-colors duration-150 bg-white">
            <span className="px-3 flex items-center text-body text-aq-muted bg-aq-surface border-r border-aq-border shrink-0">$</span>
            <input
              type="number"
              value={manualInput}
              onChange={(e) => handleManualInput(e.target.value)}
              placeholder="Enter custom amount"
              className="flex-1 px-3 text-body text-aq-ink bg-white focus:outline-none min-w-0"
            />
          </div>
        </div>

        {/* Parking note toggle */}
        <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg mb-aq-lg">
          <button
            type="button"
            onClick={() => setParkingNoteShown((v) => !v)}
            className="flex items-center justify-between w-full min-h-tap gap-aq-md"
          >
            <div className="text-left">
              <p className="text-body font-medium text-aq-ink">Show parking note on quote</p>
              <p className="text-caption text-aq-muted mt-[2px]">Adds "Parking fees may apply" to the PDF</p>
            </div>
            <div className={`relative inline-flex shrink-0 h-7 w-12 rounded-full transition-colors duration-150 ${parkingNoteShown ? 'bg-aq-green' : 'bg-aq-border'}`}>
              <span className={`inline-block h-6 w-6 mt-0.5 rounded-full bg-white shadow transition-transform duration-150 ${parkingNoteShown ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Totals */}
        <div className="bg-aq-green-tint border border-aq-green-tint-border rounded-aq-xl p-aq-lg mb-aq-2xl">
          <div className="flex justify-between items-baseline mb-aq-sm">
            <span className="text-secondary text-aq-muted">Subtotal</span>
            <span className="text-body font-medium text-aq-ink">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-baseline mb-aq-md pb-aq-md border-b border-aq-green-tint-border">
            <span className="text-secondary text-aq-muted">GST (15%)</span>
            <span className="text-secondary text-aq-muted">{formatCurrency(gst)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-body font-medium text-aq-ink">Total (incl. GST)</span>
            <span className="text-display font-medium text-aq-ink">{formatCurrency(total)}</span>
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
              <Button variant="primary" fullWidth disabled={!customerName.trim()} onClick={() => setSendModalOpen(true)}>
                Send quote
              </Button>
              <Button variant="secondary" fullWidth onClick={handleSaveDraft}>
                Save draft
              </Button>
              <button type="button" onClick={handleAcceptNow} className={btnGhost}>
                Customer accepts now
              </button>
            </>
          )}
        </div>

      </div>

      {/* ── Send quote modal ──────────────────────────────────────────────────── */}
      {sendModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-aq-xl"
          style={{ backgroundColor: 'rgba(31, 45, 55, 0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-aq-xl p-aq-xl w-full max-w-sm shadow-lg">
            <p className="text-body font-medium text-aq-ink mb-aq-xs">
              Send quote to {customerName || currentJob.customer_name}
            </p>
            <p className="text-secondary text-aq-muted mb-aq-lg">
              {formatCurrency(total)} incl. GST
            </p>
            <div className="mb-aq-lg">
              <label htmlFor="send-email" className="block text-secondary text-aq-muted mb-aq-sm">
                Customer email
              </label>
              <input
                id="send-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. sarah@example.com"
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-aq-sm">
              <button
                type="button"
                disabled={!customerEmail.trim()}
                onClick={() => handleSendByEmail(customerEmail.trim())}
                className={btnPrimary}
              >
                Send by email
              </button>
              <button type="button" onClick={handleDownloadFallback} className={btnSecondary}>
                Download PDF instead
              </button>
              <button type="button" onClick={() => setSendModalOpen(false)} className={btnGhost}>
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revise modal ──────────────────────────────────────────────────────── */}
      {reviseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-aq-xl"
          style={{ backgroundColor: 'rgba(31, 45, 55, 0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-aq-xl p-aq-xl w-full max-w-sm shadow-lg">
            <p className="text-body font-medium text-aq-ink mb-aq-sm">
              Send revised quote to {customerName || currentJob.customer_name}?
            </p>
            <p className="text-secondary text-aq-muted mb-aq-lg">
              The new total is {formatCurrency(total)}, up from {formatCurrency(originalTotal)}. They will need to accept again.
            </p>
            <div className="mb-aq-md">
              <label className="block text-secondary text-aq-muted mb-aq-sm">
                Note about changes (optional)
              </label>
              <input
                type="text"
                value={reviseNote}
                onChange={(e) => setReviseNote(e.target.value)}
                placeholder="e.g. Added second roller set"
                className={inputClass}
              />
            </div>
            <div className="mb-aq-lg">
              <label htmlFor="revise-email" className="block text-secondary text-aq-muted mb-aq-sm">
                Customer email
              </label>
              <input
                id="revise-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. sarah@example.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-aq-sm">
              <button
                type="button"
                disabled={!customerEmail.trim()}
                onClick={() => handleReviseByEmail(customerEmail.trim())}
                className={btnPrimary}
              >
                Send by email
              </button>
              <button type="button" onClick={handleReviseDownloadFallback} className={btnSecondary}>
                Download PDF instead
              </button>
              <button type="button" onClick={() => setReviseModalOpen(false)} className={btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
