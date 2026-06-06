'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || ''
const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || 'vetearii.thomas@fatpukus.co.nz'

const HIDE_ON = ['/login', '/signup', '/setup', '/forgot-password', '/reset-password', '/deactivated']

export default function FeedbackButton() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!ADMIN_USER_ID) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id === ADMIN_USER_ID) setIsAdmin(true)
    })
  }, [])

  if (isAdmin) return null
  if (HIDE_ON.some((p) => pathname?.startsWith(p))) return null

  const subject = encodeURIComponent('Jotey beta feedback')
  const href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}`

  return (
    <a
      href={href}
      aria-label="Send feedback"
      style={{
        position: 'fixed',
        bottom: 72,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4EAE8',
        borderRadius: 20,
        padding: '7px 12px',
        fontSize: 13,
        color: '#4A5B68',
        textDecoration: 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        zIndex: 40,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      Feedback
    </a>
  )
}
