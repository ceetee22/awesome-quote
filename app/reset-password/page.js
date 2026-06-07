'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import AuthBrand from '@/components/AuthBrand'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }

    // PKCE flow: code in query string
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) setInvalid(true)
        else setReady(true)
      })
      return
    }

    // Implicit flow: hash fragment fires PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [supabase, searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')

    if (!supabase) {
      router.push('/login')
      return
    }

    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-dvh bg-aq-surface flex flex-col items-center justify-center px-aq-lg">
      <div className="w-full max-w-[360px]">

        <AuthBrand />

        {invalid ? (
          <div className="text-center">
            <p className="text-body font-medium text-aq-ink mb-aq-sm">Link expired</p>
            <p className="text-secondary text-aq-muted mb-aq-xl">
              This reset link has expired or is invalid.
            </p>
            <Link
              href="/forgot-password"
              className="text-secondary text-aq-muted hover:text-aq-ink transition-colors"
            >
              Request a new link
            </Link>
          </div>
        ) : !ready ? (
          <p className="text-body text-aq-muted text-center">Checking your reset link...</p>
        ) : (
          <>
            <h1 className="text-section font-medium text-aq-ink mb-aq-xs text-center">
              Set new password
            </h1>
            <p className="text-secondary text-aq-muted mb-aq-xl text-center">
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-aq-md">
              <div>
                <label htmlFor="password" className="block text-secondary text-aq-muted mb-aq-sm">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-secondary text-aq-muted mb-aq-sm">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
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
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-aq-surface flex items-center justify-center">
        <p className="text-body text-aq-muted">Loading...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
