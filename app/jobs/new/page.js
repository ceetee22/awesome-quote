'use client'

import { useRouter } from 'next/navigation'
import { useJob } from '@/lib/job-context'
import BackButton from '@/components/BackButton'

// ── Tangible selector button ───────────────────────────────────────────────────

function TypeButton({ iconEl, label, description, bgOverride, borderOverride, dashed, onClick }) {
  function pressDown(e) {
    e.currentTarget.style.transform = 'translateY(2px)'
    e.currentTarget.style.borderBottomWidth = '1px'
  }
  function pressUp(e) {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.borderBottomWidth = '3px'
  }
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={pressDown}
      onPointerUp={pressUp}
      onPointerLeave={pressUp}
      style={{
        background: bgOverride || '#FFFFFF',
        border: dashed
          ? `1.5px dashed #E4EAE8`
          : `0.5px solid #E4EAE8`,
        borderBottom: `3px solid ${borderOverride || '#C5E8D5'}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        minHeight: 72,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform 80ms, border-bottom-width 80ms',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {iconEl}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1F2D37', margin: 0, lineHeight: 1.3 }}>{label}</p>
        {description && (
          <p style={{ fontSize: 12, color: '#8CA3A0', margin: '3px 0 0', lineHeight: 1.4 }}>{description}</p>
        )}
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8CA3A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}

// ── Solid CSS icons ────────────────────────────────────────────────────────────

function IconSlidingDoor() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Back panel */}
      <div style={{ position: 'absolute', width: 22, height: 34, background: '#22A67A', opacity: 0.35, borderRadius: 2, left: 9, top: 11 }} />
      {/* Front panel */}
      <div style={{ position: 'absolute', width: 22, height: 34, background: '#22A67A', borderRadius: 2, right: 9, top: 11 }}>
        <div style={{ position: 'absolute', width: 3, height: 10, background: '#E6F7F0', borderRadius: 2, right: 4, top: 12 }} />
      </div>
    </div>
  )
}

function IconBifoldDoor() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <div style={{ width: 13, height: 32, background: '#22A67A', borderRadius: 2, transform: 'skewX(-6deg)' }} />
      <div style={{ width: 13, height: 32, background: '#22A67A', borderRadius: 2 }} />
      <div style={{ width: 13, height: 32, background: '#22A67A', borderRadius: 2, transform: 'skewX(6deg)' }} />
    </div>
  )
}

function IconHingedDoor() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 30, height: 38 }}>
        <div style={{ width: '100%', height: '100%', background: '#22A67A', borderRadius: '2px 7px 7px 2px', position: 'relative' }}>
          <div style={{ position: 'absolute', width: 6, height: 6, background: '#E6F7F0', borderRadius: '50%', right: 5, top: '50%', transform: 'translateY(-50%)' }} />
        </div>
        <div style={{ position: 'absolute', width: 5, height: 5, background: '#147A5A', borderRadius: '50%', left: -2, top: 4 }} />
        <div style={{ position: 'absolute', width: 5, height: 5, background: '#147A5A', borderRadius: '50%', left: -2, bottom: 4 }} />
      </div>
    </div>
  )
}

function IconWindowAli() {
  return (
    <div style={{ width: 56, height: 56, background: '#E6F7F0', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 18, height: 18, background: '#22A67A', borderRadius: 3 }} />
        ))}
      </div>
    </div>
  )
}

function IconWindowTimber() {
  return (
    <div style={{ width: 56, height: 56, background: '#FEF7E6', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 18, height: 18, background: '#D9A03A', borderRadius: 3 }} />
        ))}
      </div>
    </div>
  )
}

function IconRubber() {
  return (
    <div style={{ width: 56, height: 56, background: '#FEF7E6', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 38, height: 12, background: '#F0B542', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: '50%', left: 5, right: 5, height: 2, transform: 'translateY(-50%)', backgroundImage: 'repeating-linear-gradient(to right, #FFFFFF 0, #FFFFFF 5px, transparent 5px, transparent 9px)', borderRadius: 1 }} />
      </div>
    </div>
  )
}

function IconCustom() {
  return (
    <div style={{ width: 56, height: 56, background: '#F6F8F7', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 32, height: 36, background: '#8CA3A0', borderRadius: 4 }}>
        <div style={{ position: 'absolute', height: 2, left: 6, right: 6, top: 9, background: '#F6F8F7', borderRadius: 1 }} />
        <div style={{ position: 'absolute', height: 2, left: 6, right: 6, top: 17, background: '#F6F8F7', borderRadius: 1 }} />
        <div style={{ position: 'absolute', height: 2, left: 6, right: 14, top: 25, background: '#F6F8F7', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewJobPage() {
  const router = useRouter()
  const { createJob } = useJob()

  async function handleType(type) {
    const job = await createJob({
      customer_name: '',
      customer_address: '',
      customer_phone: '',
      customer_email: '',
      source: 'direct',
    })
    if (type === 'rubber') {
      router.push(`/jobs/${job.id}/items/rubber`)
    } else if (type === 'custom') {
      router.push(`/jobs/${job.id}/items/custom`)
    } else {
      router.push(`/jobs/${job.id}/items/add?type=${type}`)
    }
  }

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/" label="Home" />
          <div className="ml-aq-sm">
            <h1 className="text-page-title font-medium text-aq-ink">New job</h1>
            <p className="text-secondary text-aq-muted">What are you looking at?</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          <TypeButton iconEl={<IconSlidingDoor />} label="Sliding door" description="Patio, balcony, and stacker doors" onClick={() => handleType('sliding_door')} />
          <TypeButton iconEl={<IconBifoldDoor />} label="Bifold door" description="Folding panel doors and wardrobes" onClick={() => handleType('bifold_door')} />
          <TypeButton iconEl={<IconHingedDoor />} label="Hinged door" description="Entry, interior, and French doors" onClick={() => handleType('hinged_door')} />
          <TypeButton iconEl={<IconWindowAli />} label="Window (aluminium)" description="Casement, awning, and sliding windows" onClick={() => handleType('window_ali')} />
          <TypeButton iconEl={<IconWindowTimber />} label="Window (timber)" description="Sash and timber-framed windows" onClick={() => handleType('window_timber')} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E4EAE8' }} />
            <span style={{ fontSize: 12, color: '#8CA3A0' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#E4EAE8' }} />
          </div>

          <TypeButton
            iconEl={<IconRubber />}
            label="Rubber and weatherseal"
            description="Quick estimate across many windows"
            bgOverride="#FFFDF7"
            borderOverride="#F5E2B0"
            onClick={() => handleType('rubber')}
          />
          <TypeButton
            iconEl={<IconCustom />}
            label="Custom item"
            description="Bespoke work, describe it yourself"
            dashed
            onClick={() => handleType('custom')}
          />

        </div>
      </div>
    </div>
  )
}
