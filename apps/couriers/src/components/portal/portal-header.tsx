import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'

import type { SessionUser } from '@/types/auth'

import { PortalAccountMenu } from './portal-account-menu'
import { PortalNav } from './portal-nav'

export function PortalHeader({
  tenantName,
  user,
}: {
  tenantName: string
  user: SessionUser | null
}) {
  const userLabel = getUserLabel(user)

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/portal"
          className="min-w-0 shrink text-base font-semibold tracking-tight"
        >
          <span className="block max-w-40 truncate sm:max-w-56">
            {tenantName}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-4">
          <PortalNav />
          {user ? (
            <PortalAccountMenu label={userLabel} email={user.email} />
          ) : (
            <Link
              href="/portal/login"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function getUserLabel(user: SessionUser | null): string {
  if (!user) return ''

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return name || user.email || 'Account'
}
