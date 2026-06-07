'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { REPAIR_TEMPLATE_FAULTS } from '@/lib/constants'
import { getRepairTemplatesCount } from '@/lib/db'
import { formatCurrency } from '@/lib/pricing'

const DEFAULTS = new Set([
  'sliding_door:Stiff or hard to slide',
  "sliding_door:Won't lock or latch",
  'window_ali:Broken stay',
  'window_ali:Drafty or leaking',
  'hinged_door:Lock or latch fault',
])

function ProgressDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current - 1 ? 20 : 8,
          height: 8, borderRadius: 4, flexShrink: 0,
          backgroundColor: i < current ? '#22A67A' : '#E4EAE8',
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  )
}

function Checkbox({ checked }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: checked ? '#22A67A' : 'transparent',
      border: checked ? 'none' : '2px solid #E4EAE8',
      transition: 'background 150ms',
    }}>
      {checked && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  )
}

function BackArrow({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#8CA3A0', fontSize: 15, cursor: 'pointer', padding: '8px 0 8px 0', display: 'flex', alignItems: 'center', gap: 6, minHeight: 48 }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M5 12l7 7M5 12l7-7" />
      </svg>
      Back
    </button>
  )
}

export default function QuickPricingPage() {
  const router = useRouter()
  const priceInputRef = useRef(null)

  const [phase, setPhase] = useState('pick')
  const [selected, setSelected] = useState(new Set(DEFAULTS))
  const [pricingQueue, setPricingQueue] = useState([])
  const [pricingIdx, setPricingIdx] = useState(0)
  const [currentPrice, setCurrentPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedItems, setSavedItems] = useState([])

  useEffect(() => {
    getRepairTemplatesCount().then((count) => {
      if (count > 0) router.replace('/')
    })
  }, [])

  useEffect(() => {
    if (phase === 'price' && priceInputRef.current) {
      const t = setTimeout(() => priceInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [phase, pricingIdx])

  const totalDots = pricingQueue.length + 2
  const currentDot = phase === 'pick' ? 1 : phase === 'price' ? pricingIdx + 2 : totalDots
  const currentRepair = phase === 'price' ? pricingQueue[pricingIdx] : null

  function toggleRepair(typeKey, faultLabel) {
    const key = `${typeKey}:${faultLabel}`
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function startPricing() {
    const queue = []
    REPAIR_TEMPLATE_FAULTS.forEach(group => {
      group.faults.forEach(faultLabel => {
        if (selected.has(`${group.type}:${faultLabel}`)) {
          queue.push({ joineryType: group.type, typeLabel: group.label, fault: faultLabel })
        }
      })
    })
    setPricingQueue(queue)
    setPricingIdx(0)
    setCurrentPrice('')
    setPhase('price')
  }

  function advanceStep() {
    if (pricingIdx + 1 < pricingQueue.length) {
      setPricingIdx(p => p + 1)
      setCurrentPrice('')
    } else {
      setPhase('done')
    }
  }

  async function saveAndNext() {
    const repair = pricingQueue[pricingIdx]
    const price = parseFloat(currentPrice)
    if (!isNaN(price) && price > 0) {
      setSaving(true)
      try {
        const res = await fetch('/api/repair-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            joinery_type: repair.joineryType,
            fault: repair.fault,
            price,
            parts: [],
            is_custom: false,
          }),
        })
        if (res.ok) {
          setSavedItems(prev => [...prev, { ...repair, price }])
        }
      } catch (e) {
        console.error('Failed to save template:', e)
      } finally {
        setSaving(false)
      }
    }
    advanceStep()
  }

  // ── Pick phase ─────────────────────────────────────────────────────────────
  if (phase === 'pick') {
    const pickTotal = selected.size + 2
    return (
      <div style={{ minHeight: '100dvh', background: '#F6F8F7' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 140px' }}>
          <div style={{ paddingTop: 16 }}>
            <BackArrow onClick={() => router.push('/')} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <ProgressDots current={1} total={pickTotal} />
            <p style={{ fontSize: 12, color: '#8CA3A0', textAlign: 'center', margin: '6px 0 20px' }}>1 of {pickTotal}</p>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: '0 0 6px', lineHeight: 1.2 }}>
              Pick your common repairs
            </h1>
            <p style={{ fontSize: 16, color: '#4A5B68', margin: 0 }}>
              Select the ones you do regularly. You'll set a price for each.
            </p>
          </div>

          {REPAIR_TEMPLATE_FAULTS.map(group => {
            const isDoor = ['sliding_door', 'bifold_door', 'hinged_door'].includes(group.type)
            return (
              <div key={group.type} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: isDoor ? '#22A67A' : '#F0B542', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#4A5B68', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {group.label}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.faults.map(faultLabel => {
                    const key = `${group.type}:${faultLabel}`
                    const isChecked = selected.has(key)
                    const isDefault = DEFAULTS.has(key)
                    return (
                      <button
                        key={faultLabel}
                        type="button"
                        onClick={() => toggleRepair(group.type, faultLabel)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: isChecked ? '#E6F7F0' : '#FFFFFF',
                          border: `1px solid ${isChecked ? '#C5E8D5' : '#E4EAE8'}`,
                          borderRadius: 10, padding: '12px 14px', minHeight: 48,
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          transition: 'background 150ms, border-color 150ms',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <Checkbox checked={isChecked} />
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1F2D37', lineHeight: 1.3 }}>
                          {faultLabel}
                        </span>
                        {isDefault && (
                          <span style={{ fontSize: 11, color: '#8CA3A0', fontStyle: 'italic', flexShrink: 0 }}>Common</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderTop: '1px solid #E4EAE8', padding: '12px 16px' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ fontSize: 13, color: '#8CA3A0', textAlign: 'center', margin: '0 0 10px' }}>
              {selected.size} selected
            </p>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={startPricing}
              style={{
                width: '100%', minHeight: 48, borderRadius: 10, border: 'none',
                background: '#22A67A', color: '#FFFFFF', fontSize: 17, fontWeight: 500,
                cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                opacity: selected.size > 0 ? 1 : 0.4,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Price phase ────────────────────────────────────────────────────────────
  if (phase === 'price' && currentRepair) {
    const priceVal = parseFloat(currentPrice)
    const canSave = !isNaN(priceVal) && priceVal > 0

    return (
      <div style={{ minHeight: '100dvh', background: '#F6F8F7' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 140px' }}>
          <BackArrow onClick={() => {
            if (pricingIdx === 0) { setPhase('pick'); setCurrentPrice('') }
            else { setPricingIdx(p => p - 1); setCurrentPrice('') }
          }} />

          <div style={{ marginBottom: 24 }}>
            <ProgressDots current={currentDot} total={totalDots} />
            <p style={{ fontSize: 12, color: '#8CA3A0', textAlign: 'center', margin: '6px 0 0' }}>
              {pricingIdx + 1} of {pricingQueue.length}
            </p>
          </div>

          <div style={{ background: '#1F2D37', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: '#8CA3A0', margin: '0 0 6px' }}>{currentRepair.typeLabel}</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
              {currentRepair.fault}
            </p>
          </div>

          <p style={{ fontSize: 15, color: '#4A5B68', textAlign: 'center', margin: '0 0 20px' }}>
            What do you charge for this repair?
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
              <span style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                fontSize: 28, color: '#8CA3A0', pointerEvents: 'none', lineHeight: 1, userSelect: 'none',
              }}>
                $
              </span>
              <input
                ref={priceInputRef}
                type="text"
                inputMode="decimal"
                value={currentPrice}
                onChange={e => setCurrentPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter' && canSave && !saving) saveAndNext() }}
                placeholder="0"
                style={{
                  width: '100%', padding: '20px 20px 20px 44px',
                  fontSize: 32, fontWeight: 600, color: '#1F2D37',
                  border: '2px solid #22A67A', borderRadius: 12,
                  background: '#FFFFFF', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#8CA3A0', textAlign: 'center', margin: 0 }}>GST inclusive</p>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderTop: '1px solid #E4EAE8', padding: '12px 16px' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              disabled={!canSave || saving}
              onClick={saveAndNext}
              style={{
                width: '100%', minHeight: 48, borderRadius: 10, border: 'none',
                background: '#22A67A', color: '#FFFFFF', fontSize: 17, fontWeight: 500,
                cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                opacity: canSave && !saving ? 1 : 0.4,
              }}
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
            <button
              type="button"
              onClick={advanceStep}
              disabled={saving}
              style={{ background: 'none', border: 'none', color: '#8CA3A0', fontSize: 13, cursor: 'pointer', padding: '8px 0', textAlign: 'center' }}
            >
              Skip this one
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Done phase ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#F6F8F7' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 16px 140px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#E6F7F0', border: '2px solid #C5E8D5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22A67A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1F2D37', margin: '0 0 8px' }}>Prices set</h1>
          <p style={{ fontSize: 14, color: '#4A5B68', margin: 0, lineHeight: 1.5 }}>
            These will auto-fill when you quote. You can edit them anytime in Settings.
          </p>
        </div>

        {savedItems.length > 0 && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, overflow: 'hidden' }}>
            {savedItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', gap: 12,
                borderBottom: i < savedItems.length - 1 ? '1px solid #E4EAE8' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#8CA3A0', margin: '0 0 2px' }}>{item.typeLabel}</p>
                  <p style={{ fontSize: 15, fontWeight: 500, color: '#1F2D37', margin: 0 }}>{item.fault}</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#22A67A', flexShrink: 0 }}>
                  {formatCurrency(item.price)}
                </span>
              </div>
            ))}
          </div>
        )}

        {savedItems.length === 0 && (
          <p style={{ fontSize: 14, color: '#8CA3A0', textAlign: 'center' }}>
            No prices saved this time. You can add them in Settings anytime.
          </p>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderTop: '1px solid #E4EAE8', padding: '12px 16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              width: '100%', minHeight: 48, borderRadius: 10,
              border: 'none', borderBottom: '2px solid #D9A03A',
              background: '#F0B542', color: '#1F2D37',
              fontSize: 17, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Start quoting
          </button>
        </div>
      </div>
    </div>
  )
}
