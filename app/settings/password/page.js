'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'

const inputClass =
  'w-full bg-white border border-aq-border rounded-aq-md min-h-tap px-4 text-body text-aq-ink placeholder:text-aq-subtle focus:outline-none focus:border-aq-green transition-colors duration-150'

const labelClass = 'block text-secondary text-aq-muted mb-aq-sm'

export default function PasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)

  async function handleSave() {
    setError('')
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSaveStatus('saving')
    const supabase = createSupabaseBrowserClient()
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    if (err) {
      setError(err.message)
      setSaveStatus(null)
      return
    }
    setSaveStatus('saved')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const isEmpty = !currentPassword || !newPassword || !confirmPassword

  return (
    <div className="min-h-dvh bg-aq-surface">
      <div className="max-w-[480px] mx-auto px-aq-lg pb-[88px]">

        <div className="flex items-center gap-aq-sm py-aq-xl">
          <BackButton href="/settings" label="Settings" />
          <h1 className="text-page-title font-medium text-aq-ink ml-aq-sm">Change password</h1>
        </div>

        <div className="flex flex-col gap-aq-lg">

          {error && (
            <div className="bg-aq-error-tint border border-red-200 rounded-aq-xl p-aq-lg">
              <p className="text-secondary text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white border border-aq-border rounded-aq-xl p-aq-lg">
            <div className="flex flex-col gap-aq-md">

              <div>
                <label htmlFor="current-password" className={labelClass}>Current password</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="new-password" className={labelClass}>New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
                <p className="text-caption text-aq-muted mt-aq-xs">At least 8 characters.</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className={labelClass}>Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

            </div>
          </div>

          <Button variant="primary" fullWidth onClick={handleSave} disabled={isEmpty || saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </Button>
          {saveStatus === 'saved' && (
            <p className="text-secondary font-medium text-aq-green text-center">Password changed.</p>
          )}

        </div>
      </div>
    </div>
  )
}
