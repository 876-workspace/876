import { redirect } from 'next/navigation'

import { PlatformUnavailable } from '@/components/platform-unavailable'
import { getInvoiceContextResult } from '@/lib/auth/context'

import { RecoveryWatcher } from './_components/recovery-watcher'

/**
 * Reached by a redirect from the app shell when the platform could not be
 * reached. Resolve the context again on every render so a reload — or the
 * client watcher — leaves this screen the moment the outage clears, rather than
 * showing a stale outage long after 876 came back.
 */
export default async function UnavailablePage() {
  const result = await getInvoiceContextResult()
  if (result.status !== 'unavailable') redirect('/')

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <PlatformUnavailable />
      </div>
      <RecoveryWatcher />
    </div>
  )
}
