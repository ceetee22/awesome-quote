'use client'

import { JobProvider } from '@/lib/job-context'

export default function Providers({ children }) {
  return <JobProvider>{children}</JobProvider>
}
