'use client'

import { JobProvider } from '@/lib/job-context'
import { SettingsProvider } from '@/lib/settings-context'
import BottomNav from '@/components/BottomNav'
import { usePathname, useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import { useEffect } from 'react'

function SetupGuard() {
  const { settings, settingsLoaded } = useSettings()
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    if (!settingsLoaded) return
    if (settings?.setup_complete === false && !pathname.startsWith('/setup')) {
      router.push('/setup')
    }
  }, [settingsLoaded, settings?.setup_complete, pathname, router])
  return null
}

export default function Providers({ children }) {
  const pathname = usePathname()
  return (
    <SettingsProvider>
      <JobProvider>
        <SetupGuard />
        {children}
        {!pathname?.startsWith('/planner') && <BottomNav />}
      </JobProvider>
    </SettingsProvider>
  )
}
