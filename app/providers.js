'use client'

import { JobProvider } from '@/lib/job-context'
import { SettingsProvider } from '@/lib/settings-context'
import BottomNav from '@/components/BottomNav'
import FeedbackButton from '@/components/FeedbackButton'
import { usePathname, useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import { useEffect } from 'react'

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth']

function Guards() {
  const { settings, settingsLoaded } = useSettings()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!settingsLoaded) return
    // Never redirect from auth pages — they handle their own flow
    if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return

    // Deactivated check has highest priority
    if (settings?.active === false && !pathname.startsWith('/deactivated')) {
      router.push('/deactivated')
      return
    }

    // Setup wizard redirect
    if (
      settings?.setup_complete === false &&
      !pathname.startsWith('/setup') &&
      !pathname.startsWith('/deactivated')
    ) {
      router.push('/setup')
    }
  }, [settingsLoaded, settings?.active, settings?.setup_complete, pathname, router])

  return null
}

export default function Providers({ children }) {
  const pathname = usePathname()
  return (
    <SettingsProvider>
      <JobProvider>
        <Guards />
        {children}
        {!pathname?.startsWith('/planner') && !pathname?.startsWith('/quick-pricing') && <BottomNav />}
        <FeedbackButton />
      </JobProvider>
    </SettingsProvider>
  )
}
