import type { Metadata } from 'next'

import { Lock } from '@876/ui/icons'
import { AuthPageShell } from '@876/ui/auth'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { AccessDeniedActions } from './access-denied-actions'

export const metadata: Metadata = {
  title: 'Access denied',
  robots: { index: false, follow: false },
}

type AccessDeniedReason = 'permission' | 'suspended' | 'no-account'

function resolveReason(
  value: string | string[] | undefined
): AccessDeniedReason {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === 'suspended' || raw === 'no-account') return raw
  return 'permission'
}

function getCopy(
  reason: AccessDeniedReason,
  email: string
): { heading: string; body: string } {
  const account = email || 'this account'
  switch (reason) {
    case 'suspended':
      return {
        heading: 'Account suspended',
        body: `The 876 account ${account} has been suspended and can't access Console. Contact a platform administrator if you think this is a mistake.`,
      }
    case 'no-account':
      return {
        heading: 'No Console profile',
        body: `We couldn't find a Console profile for ${account}. Ask a platform administrator to grant you access, or sign in with a different account.`,
      }
    case 'permission':
    default:
      return {
        heading: "You don't have access",
        body: `The 876 account ${account} isn't authorized to use Console. Ask a platform administrator for access, or sign in with a different account.`,
      }
  }
}

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string | string[] }>
}) {
  const params = await searchParams
  const reason = resolveReason(params.reason)

  const session = await getAuthSession()
  const email = isSignedSession(session) ? session.user.email : ''
  const { heading, body } = getCopy(reason, email)

  return (
    <AuthPageShell>
      <header className="text-center">
        <div className="mb-4 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--auth-card-border)] bg-[color-mix(in_oklab,var(--color-error)_10%,var(--auth-card-surface))] text-[var(--color-error)]">
            <Lock aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
        <h1 className="876-page-title text-[var(--color-base-content)]">
          {heading}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--auth-muted)]">
          {body}
        </p>
      </header>

      <AccessDeniedActions />
    </AuthPageShell>
  )
}
