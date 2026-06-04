'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

// Brand colours
const C = {
  green:      '#22A67A',
  greenTint:  '#E6F7F0',
  greenBorder:'#C5E8D5',
  ink:        '#1F2D37',
  muted:      '#4A5B68',
  border:     '#E4EAE8',
  surface:    '#F6F8F7',
  white:      '#FFFFFF',
}

function fmtCurrency(n) {
  if (!n && n !== 0) return '$0.00'
  return `$${parseFloat(n).toFixed(2)}`
}

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return '' }
}

function GreenTick() {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 20px',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
        stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
}

function AQMonogram() {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 8, background: C.green,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: '-0.5px' }}>
        AQ
      </span>
    </div>
  )
}

// Totals computed from quote data
function computeTotals(quote) {
  const partsTotal = (quote.items || [])
    .flatMap((i) => i.parts || [])
    .reduce((s, p) => s + p.sell_price * p.qty, 0)
  const labourTotal = (quote.labour_hours || 0) * (quote.hourly_rate || 0)
  const calloutFee  = quote.callout_fee || 0
  const subtotal    = partsTotal + labourTotal + calloutFee
  const gst         = subtotal * ((quote.gst_rate || 15) / 100)
  const total       = subtotal + gst
  return { partsTotal, labourTotal, calloutFee, subtotal, gst, total }
}

const ALREADY_ACCEPTED = ['accepted', 'ordered', 'scheduled', 'completed', 'invoiced']

export default function AcceptPage() {
  const params = useParams()
  const id = params.id

  const [state, setState] = useState('loading') // loading | ready | confirming | accepting | accepted | already | error
  const [quote, setQuote] = useState(null)

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then((data) => {
        setQuote(data)
        if (ALREADY_ACCEPTED.includes(data.status)) {
          setState('already')
        } else {
          setState('ready')
        }
      })
      .catch(() => setState('error'))
  }, [id])

  async function handleAccept() {
    setState('accepting')
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      if (!res.ok) throw new Error('failed')
      setState('accepted')
    } catch {
      setState('error')
    }
  }

  const wrap = {
    minHeight: '100dvh',
    background: C.surface,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  }
  const inner = {
    maxWidth: 480,
    margin: '0 auto',
    padding: '24px 20px 48px',
  }

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={wrap}>
        <div style={{ ...inner, display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <p style={{ color: C.muted, fontSize: 16 }}>Loading...</p>
        </div>
      </div>
    )
  }

  // ── ERROR / NOT FOUND ────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div style={wrap}>
        <div style={{ ...inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: C.muted, fontSize: 18 }}>This quote is no longer available.</p>
        </div>
      </div>
    )
  }

  const bizName = quote?.business_name || 'Awesome Building Services'
  const totals = quote ? computeTotals(quote) : null

  // ── ALREADY ACCEPTED ────────────────────────────────────────────────────────
  if (state === 'already') {
    return (
      <div style={wrap}>
        <div style={{ ...inner, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <AQMonogram />
            <span style={{ fontWeight: 500, fontSize: 16, color: C.ink }}>{bizName}</span>
          </div>
          <GreenTick />
          <p style={{ fontWeight: 500, fontSize: 22, color: C.green, marginBottom: 12 }}>
            This quote has already been accepted.
          </p>
          <p style={{ color: C.muted, fontSize: 16 }}>
            Thank you. {bizName} will be in touch to arrange the work.
          </p>
        </div>
      </div>
    )
  }

  // ── SUCCESS ─────────────────────────────────────────────────────────────────
  if (state === 'accepted') {
    return (
      <div style={wrap}>
        <div style={{ ...inner, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <AQMonogram />
            <span style={{ fontWeight: 500, fontSize: 16, color: C.ink }}>{bizName}</span>
          </div>
          <GreenTick />
          <p style={{ fontWeight: 500, fontSize: 26, color: C.green, marginBottom: 12 }}>
            Quote accepted
          </p>
          <p style={{ color: C.muted, fontSize: 16 }}>
            Thank you. {bizName} will be in touch to arrange the work.
          </p>
        </div>
      </div>
    )
  }

  // ── QUOTE VIEW (ready or confirming/accepting) ───────────────────────────────
  const isAccepting = state === 'accepting'

  return (
    <div style={wrap}>
      <div style={inner}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <AQMonogram />
          <div>
            <p style={{ fontWeight: 500, fontSize: 16, color: C.ink, margin: 0 }}>{bizName}</p>
          </div>
        </div>

        {/* Job heading */}
        <h1 style={{ fontWeight: 500, fontSize: 26, color: C.ink, marginBottom: 4, marginTop: 0 }}>
          Quote for {quote.customer_name}
        </h1>
        {quote.customer_address && (
          <p style={{ color: C.muted, fontSize: 16, marginBottom: 4, marginTop: 0 }}>
            {quote.customer_address}
          </p>
        )}
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28, marginTop: 0 }}>
          {fmtDate(quote.created_at)}
        </p>

        {/* Items summary card */}
        <div style={{
          background: C.white, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <p style={{ fontWeight: 500, fontSize: 17, color: C.ink, margin: '0 0 16px' }}>
            Quote summary
          </p>

          {(quote.items || []).map((item) => {
            const partsCost = (item.parts || []).reduce((s, p) => s + p.sell_price * p.qty, 0)
            const partsCount = (item.parts || []).length
            let label
            if (item.type === 'diagnosed') {
              label = [item.joinery_type_label || item.joinery_type, item.fault_label || item.fault]
                .filter(Boolean).join(' - ')
            } else {
              label = item.description || 'Custom item'
            }
            return (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '10px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: C.ink }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
                    {partsCount} {partsCount === 1 ? 'part' : 'parts'}
                  </p>
                </div>
                <span style={{ fontWeight: 500, fontSize: 15, color: C.ink, whiteSpace: 'nowrap' }}>
                  {fmtCurrency(partsCost)}
                </span>
              </div>
            )
          })}

          {totals.labourTotal > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: C.ink }}>Labour</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
                  {quote.labour_hours} hr at {fmtCurrency(quote.hourly_rate)}/hr
                </p>
              </div>
              <span style={{ fontWeight: 500, fontSize: 15, color: C.ink }}>
                {fmtCurrency(totals.labourTotal)}
              </span>
            </div>
          )}

          {totals.calloutFee > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <p style={{ margin: 0, fontSize: 15, color: C.ink }}>Callout fee</p>
              <span style={{ fontWeight: 500, fontSize: 15, color: C.ink }}>
                {fmtCurrency(totals.calloutFee)}
              </span>
            </div>
          )}

          {/* Totals */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: C.muted }}>Subtotal</span>
              <span style={{ fontSize: 14, color: C.muted }}>{fmtCurrency(totals.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: C.muted }}>GST ({quote.gst_rate}%)</span>
              <span style={{ fontSize: 14, color: C.muted }}>{fmtCurrency(totals.gst)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              background: C.greenTint, border: `1px solid ${C.greenBorder}`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <span style={{ fontWeight: 500, fontSize: 17, color: C.ink }}>Total (incl. GST)</span>
              <span style={{ fontWeight: 500, fontSize: 20, color: C.ink }}>
                {fmtCurrency(totals.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Before photos gallery */}
        {(() => {
          const beforePhotos = (quote.items || []).flatMap((item) => item.photos || [])
          if (beforePhotos.length === 0) return null
          return (
            <div style={{
              background: C.white, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 20, marginBottom: 16,
            }}>
              <p style={{ fontWeight: 500, fontSize: 17, color: C.ink, margin: '0 0 16px' }}>
                Photos of the issue
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {beforePhotos.map((photo, idx) => (
                  <div key={photo.id || idx} style={{ borderRadius: 10, overflow: 'hidden', background: C.surface }}>
                    <img
                      src={photo.url}
                      alt={photo.caption || ''}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                    {photo.caption && (
                      <p style={{ margin: '6px 8px 8px', fontSize: 13, color: C.muted }}>{photo.caption}</p>
                    )}
                  </div>
                ))}
              </div>
              <a
                href={`/done/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 16, minHeight: 48, padding: '0 20px',
                  border: `2px solid ${C.green}`, borderRadius: 10,
                  color: C.green, fontWeight: 500, fontSize: 15,
                  background: 'transparent', cursor: 'pointer', textDecoration: 'none',
                }}
              >
                View photos
              </a>
            </div>
          )
        })()}

        {/* Accept section */}
        {state === 'confirming' ? (
          <div style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 20,
          }}>
            <p style={{ fontWeight: 500, fontSize: 17, color: C.ink, margin: '0 0 8px' }}>
              Accept this quote for {fmtCurrency(totals.total)}?
            </p>
            <p style={{ color: C.muted, fontSize: 15, margin: '0 0 20px' }}>
              This confirms you would like {bizName} to proceed with the work.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10, border: 'none',
                  background: C.green, color: '#fff', fontWeight: 500, fontSize: 17,
                  cursor: isAccepting ? 'not-allowed' : 'pointer',
                  opacity: isAccepting ? 0.7 : 1,
                }}
              >
                {isAccepting ? 'Accepting...' : 'Yes, accept'}
              </button>
              <button
                onClick={() => setState('ready')}
                disabled={isAccepting}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.white,
                  color: C.ink, fontWeight: 500, fontSize: 17, cursor: 'pointer',
                }}
              >
                Go back
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setState('confirming')}
            style={{
              width: '100%', minHeight: 48, borderRadius: 10, border: 'none',
              background: C.green, color: '#fff', fontWeight: 500, fontSize: 17,
              cursor: 'pointer',
            }}
          >
            Accept this quote
          </button>
        )}

      </div>
    </div>
  )
}
