'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createBusiness } from '@/lib/db'
import AuthBrand from '@/components/AuthBrand'

const inputClass = 'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      router.push('/setup')
      return
    }

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, business_name: businessName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupErr) {
      const msg = signupErr.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered')) {
        setError('An account with that email already exists. Try logging in.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    if (data.session) {
      await createBusiness({ owner_id: data.user.id, name: businessName, contact_person_name: fullName, contact_email: email })
      router.push('/setup')
      router.refresh()
      return
    }

    setCheckEmail(true)
    setLoading(false)
  }

  if (checkEmail) {
    return (
      <div className="min-h-dvh bg-aq-surface flex flex-col items-center justify-center px-aq-lg">
        <div className="w-full max-w-[400px] text-center">
          <AuthBrand />
          <h1 className="text-section font-medium text-aq-ink mb-aq-sm">Check your email</h1>
          <p className="text-secondary text-aq-muted mb-aq-xl">
            We sent a verification link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <Link href="/login" className="text-secondary text-aq-muted hover:text-aq-ink transition-colors">
            Back to log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-aq-surface flex flex-col items-center justify-center px-aq-lg py-aq-2xl">
      <div className="w-full max-w-[400px]">
        <AuthBrand />

        <h2 className="text-section font-medium text-aq-ink mb-aq-xs text-center">Create your account</h2>
        <p className="text-secondary text-aq-muted mb-aq-xl text-center">Get started with your free Jotey account.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-aq-md">
          <div>
            <label htmlFor="fullName" className="block text-secondary text-aq-muted mb-aq-sm">Full name</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="businessName" className="block text-secondary text-aq-muted mb-aq-sm">Business name</label>
            <input id="businessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className="block text-secondary text-aq-muted mb-aq-sm">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="block text-secondary text-aq-muted mb-aq-sm">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} className={inputClass} />
            <p className="text-caption text-aq-subtle mt-aq-xs">At least 8 characters</p>
          </div>

          {error && (
            <div className="bg-aq-error-tint border border-aq-error-tint-border rounded-aq-md px-4 py-3">
              <p className="text-secondary text-aq-error">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full min-h-tap bg-aq-green text-white text-btn font-medium rounded-aq-lg hover:bg-aq-green-hover active:bg-aq-green-pressed disabled:opacity-50 transition-colors duration-150">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-secondary text-aq-muted mt-aq-xl">
          Already have an account?{' '}
          <Link href="/login" className="text-aq-green font-medium hover:text-aq-green-hover transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
