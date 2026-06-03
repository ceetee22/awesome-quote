'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setSent(true)
      return
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-dvh bg-aq-surface flex flex-col items-center justify-center px-aq-lg">
      <div className="w-full max-w-[360px]">

        {/* Brand */}
        <div className="flex flex-col items-center mb-aq-2xl">
          <div className="w-16 h-16 rounded-aq-xl bg-aq-green flex items-center justify-center mb-aq-md">
            <span className="text-white font-bold text-xl select-none">AQ</span>
          </div>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-body font-medium text-aq-ink mb-aq-sm">Check your email</p>
            <p className="text-secondary text-aq-muted mb-aq-xl">
              A reset link has been sent to {email}. Check your inbox.
            </p>
            <Link
              href="/login"
              className="text-secondary text-aq-muted hover:text-aq-ink transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-section font-medium text-aq-ink mb-aq-xs text-center">
              Reset your password
            </h1>
            <p className="text-secondary text-aq-muted mb-aq-xl text-center">
              Enter your email to receive a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-aq-md">
              <div>
                <label htmlFor="email" className="block text-secondary text-aq-muted mb-aq-sm">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="text-secondary text-aq-error">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-tap bg-aq-green text-white text-btn font-medium rounded-aq-lg hover:bg-aq-green-hover active:bg-aq-green-pressed disabled:opacity-50 transition-colors duration-150"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="text-center mt-aq-lg">
              <Link
                href="/login"
                className="text-secondary text-aq-muted hover:text-aq-ink transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
