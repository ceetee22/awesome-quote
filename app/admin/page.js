'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || ''

function formatDate(str) {
  if (!str) return '-'
  return new Date(str).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ flex: '1 1 120px', backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: '12px 14px' }}>
      <p style={{ fontSize: 13, color: '#4A5B68', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 600, color: color || '#1F2D37', margin: 0 }}>{value}</p>
    </div>
  )
}

function UserCard({ biz, onToggle, toggling }) {
  const [expanded, setExpanded] = useState(false)
  const isActive = biz.active !== false

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {biz.name || 'Unnamed business'}
            </p>
            <p style={{ fontSize: 14, color: '#4A5B68', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {biz.owner_name ? `${biz.owner_name} · ` : ''}{biz.owner_email || '-'}
            </p>
          </div>
          <span style={{
            flexShrink: 0, fontSize: 13, padding: '3px 10px', borderRadius: 20, fontWeight: 500,
            backgroundColor: isActive ? '#E6F7F0' : '#FEE2E2',
            color: isActive ? '#22A67A' : '#D94444',
          }}>
            {isActive ? 'Active' : 'Deactivated'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#8CA3A0' }}>Signed up {formatDate(biz.created_at)}</span>
          <span style={{ fontSize: 13, color: '#8CA3A0' }}>Setup: {biz.setup_complete ? 'done' : 'incomplete'}</span>
          <span style={{ fontSize: 13, color: '#8CA3A0' }}>{biz.job_count} jobs</span>
          <span style={{ fontSize: 13, color: '#8CA3A0' }}>{biz.quotes_sent} quotes</span>
          <span style={{ fontSize: 13, color: '#8CA3A0' }}>
            Last active: {formatDate(biz.last_activity || biz.owner_last_sign_in)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onToggle(biz.id, isActive)}
            disabled={toggling === biz.id}
            style={{
              minHeight: 40, paddingLeft: 14, paddingRight: 14, borderRadius: 8,
              border: '1px solid #E4EAE8', background: '#FFFFFF',
              color: isActive ? '#D94444' : '#22A67A',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              opacity: toggling === biz.id ? 0.5 : 1,
            }}
          >
            {toggling === biz.id ? '...' : isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ minHeight: 40, paddingLeft: 14, paddingRight: 14, borderRadius: 8, border: '1px solid #E4EAE8', background: '#FFFFFF', color: '#4A5B68', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            {expanded ? 'Hide details' : 'View details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #E4EAE8', padding: '14px 16px', backgroundColor: '#F6F8F7' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            {[
              ['Business ID', biz.id],
              ['Owner ID', biz.owner_id],
              ['Owner email', biz.owner_email],
              ['Owner name', biz.owner_name || '-'],
              ['Signup date', formatDate(biz.created_at)],
              ['Last sign in', formatDate(biz.owner_last_sign_in)],
              ['Setup complete', biz.setup_complete ? 'Yes' : 'No'],
              ['Onboarding done', biz.onboarding_complete ? 'Yes' : 'No'],
              ['Total jobs', biz.job_count],
              ['Quotes sent', biz.quotes_sent],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ fontSize: 12, color: '#8CA3A0', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 13, color: '#1F2D37', margin: 0, wordBreak: 'break-all' }}>{String(value ?? '-')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [toggling, setToggling] = useState(null)

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient()
      if (!supabase || !ADMIN_USER_ID) { router.replace('/'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== ADMIN_USER_ID) { router.replace('/'); return }

      const res = await fetch('/api/admin/data')
      if (!res.ok) { router.replace('/'); return }
      setData(await res.json())
      setLoading(false)
    }
    init()
  }, [])

  async function handleToggle(businessId, currentlyActive) {
    setToggling(businessId)
    await fetch('/api/admin/toggle-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, active: !currentlyActive }),
    })
    const res = await fetch('/api/admin/data')
    setData(await res.json())
    setToggling(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#F6F8F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8CA3A0', fontSize: 16 }}>Loading...</p>
      </div>
    )
  }

  const { businesses = [], summary = {} } = data || {}

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#F6F8F7' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 48px' }}>

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1F2D37', margin: 0 }}>Admin</h1>
            <p style={{ fontSize: 14, color: '#8CA3A0', margin: '2px 0 0' }}>Jotey user management</p>
          </div>
          <Link href="/" style={{ fontSize: 14, color: '#4A5B68', textDecoration: 'none' }}>Back to app</Link>
        </header>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <SummaryCard label="Total users" value={summary.total_users ?? 0} />
          <SummaryCard label="Active users" value={summary.active_users ?? 0} color="#22A67A" />
          <SummaryCard label="Total jobs" value={summary.total_jobs ?? 0} />
          <SummaryCard label="Quotes sent" value={summary.total_quotes ?? 0} color="#3B82D6" />
        </div>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1F2D37', margin: '0 0 12px' }}>Users</h2>
          {businesses.length === 0 ? (
            <p style={{ color: '#8CA3A0', fontSize: 15 }}>No users yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {businesses.map((biz) => (
                <UserCard key={biz.id} biz={biz} onToggle={handleToggle} toggling={toggling} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
