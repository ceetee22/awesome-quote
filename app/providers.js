'use client'

import { JobProvider } from '@/lib/job-context'
import { SettingsProvider } from '@/lib/settings-context'
import BottomNav from '@/components/BottomNav'

export default function Providers({ children }) {
  return (
    <SettingsProvider>
      <JobProvider>
        {children}
        <BottomNav />
      </JobProvider>
    </SettingsProvider>
  )
}
