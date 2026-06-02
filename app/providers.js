'use client'

import { JobProvider } from '@/lib/job-context'
import { SettingsProvider } from '@/lib/settings-context'

export default function Providers({ children }) {
  return (
    <SettingsProvider>
      <JobProvider>{children}</JobProvider>
    </SettingsProvider>
  )
}
