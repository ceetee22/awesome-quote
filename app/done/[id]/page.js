'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

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

function getInitials(name) {
  if (!name) return ''
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function BusinessLogo({ logoUrl, bizName }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={bizName}
        style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain', flexShrink: 0, background: '#ffffff' }}
      />
    )
  }
  const initials = getInitials(bizName)
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 8, background: C.green,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontWeight: 600, fontSize: initials.length > 1 ? 15 : 18, letterSpacing: '-0.5px' }}>
        {initials}
      </span>
    </div>
  )
}

function PhotoGallery({ photos }) {
  if (!photos || photos.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
      {photos.map((photo, idx) => (
        <div key={photo.id || idx} style={{ borderRadius: 10, overflow: 'hidden', background: C.surface }}>
          <img
            src={photo.url}
            alt={photo.caption || 'Job photo'}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
          {photo.caption && (
            <p style={{ margin: '8px 8px', fontSize: 13, color: C.muted }}>{photo.caption}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function DonePage() {
  const params = useParams()
  const id = params.id

  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`/api/done/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then((d) => { setData(d); setState('ready') })
      .catch(() => setState('error'))
  }, [id])

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

  if (state === 'loading') {
    return (
      <div style={wrap}>
        <div style={{ ...inner, display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <p style={{ color: C.muted, fontSize: 16 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={wrap}>
        <div style={{ ...inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: C.muted, fontSize: 18 }}>This page is no longer available.</p>
        </div>
      </div>
    )
  }

  const items = data.items || []
  const legacyAfterPhotos = data.legacy_after_photos || []
  const hasPhotos = items.length > 0 || legacyAfterPhotos.length > 0

  return (
    <div style={wrap}>
      <div style={inner}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <BusinessLogo logoUrl={data.logo_url} bizName={data.trading_name || data.business_name} />
          <div>
            <p style={{ fontWeight: 500, fontSize: 16, color: C.ink, margin: 0 }}>
              {data.trading_name || data.business_name}
            </p>
            {(data.business_phone || data.business_email) && (
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                {[data.business_phone, data.business_email].filter(Boolean).join('   ')}
              </p>
            )}
          </div>
        </div>

        <h1 style={{ fontWeight: 500, fontSize: 26, color: C.ink, margin: '0 0 4px' }}>
          Before and after
        </h1>
        {data.customer_name && (
          <p style={{ color: C.muted, fontSize: 16, margin: '0 0 28px' }}>
            {data.customer_name}
          </p>
        )}

        {!hasPhotos && (
          <div style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 24, textAlign: 'center',
          }}>
            <p style={{ color: C.muted, fontSize: 16, margin: 0 }}>No photos have been added yet.</p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} style={{ marginBottom: 32 }}>
            <p style={{ fontWeight: 600, fontSize: 16, color: C.ink, margin: '0 0 12px' }}>
              {item.label}
            </p>
            {item.before_photos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 500, fontSize: 14, color: C.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Before</p>
                <PhotoGallery photos={item.before_photos} />
              </div>
            )}
            {item.after_photos.length > 0 && (
              <div>
                <p style={{ fontWeight: 500, fontSize: 14, color: C.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>After</p>
                <PhotoGallery photos={item.after_photos} />
              </div>
            )}
          </div>
        ))}

        {legacyAfterPhotos.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontWeight: 500, fontSize: 18, color: C.ink, margin: '0 0 16px' }}>After</p>
            <PhotoGallery photos={legacyAfterPhotos} />
          </div>
        )}

        <div style={{
          marginTop: 40, paddingTop: 20,
          borderTop: `1px solid ${C.border}`,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Completed by {data.business_name}
          </p>
        </div>

      </div>
    </div>
  )
}
