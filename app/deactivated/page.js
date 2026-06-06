'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@jotey.app'

export default function DeactivatedPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#F6F8F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 12, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1F2D37', margin: '0 0 12px' }}>Account not active</h1>
        <p style={{ fontSize: 16, color: '#4A5B68', margin: '0 0 24px', lineHeight: 1.5 }}>
          Your account has been deactivated. Contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#22A67A', textDecoration: 'none' }}>
            {SUPPORT_EMAIL}
          </a>{' '}
          for help.
        </p>
        <button
          onClick={handleSignOut}
          style={{ minHeight: 48, paddingLeft: 24, paddingRight: 24, borderRadius: 10, border: '1px solid #E4EAE8', background: '#FFFFFF', color: '#4A5B68', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
