'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      // No Supabase configured — go straight in (dev/mock mode)
      router.push('/')
      router.refresh()
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Incorrect email or password.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-dvh bg-aq-surface flex flex-col items-center justify-center px-aq-lg">
      <div className="w-full max-w-[360px]">

        {/* Brand */}
        <div className="flex flex-col items-center mb-aq-2xl">
          <div className="w-16 h-16 rounded-aq-xl bg-aq-green flex items-center justify-center mb-aq-md">
            <span className="text-white font-bold text-xl select-none">J</span>
          </div>
          <h1 className="text-page-title font-medium text-aq-ink">Jotey</h1>
        </div>

        {/* Form */}
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

          <div>
            <label htmlFor="password" className="block text-secondary text-aq-muted mb-aq-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center mt-aq-lg">
          <Link
            href="/forgot-password"
            className="text-secondary text-aq-muted hover:text-aq-ink transition-colors"
          >
            Forgot password?
          </Link>
        </div>

      </div>
    </div>
  )
}
