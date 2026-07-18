import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { ONBOARDING_COUNTRY, ORGANIZATION_TARGET_KEY } from '@/lib/onboarding'

import { OnboardingWizard } from './onboarding-wizard'

function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Brand panel — desktop only */}
      <div className="hidden flex-col bg-[var(--couriers-brand-dark)] px-14 py-16 text-white lg:flex lg:w-5/12">
        <p className="text-sm font-medium tracking-wide text-white/40 uppercase">
          876 Couriers
        </p>
      </div>

      {/* Wizard panel */}
      <div className="text-foreground flex flex-1 flex-col justify-center px-5 py-10 sm:px-10 sm:py-16 lg:px-20">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}

function SetupUnavailable() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">
        Setup is unavailable.
      </h2>
      <Link
        href="/"
        className="text-primary text-sm font-medium hover:underline"
      >
        Try again
      </Link>
    </div>
  )
}

export default async function OnboardingPage() {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect('/login')

  const ctx = await getManageContext()
  if (ctx && ctx.tenant && ctx.accessStatus === 'active')
    redirect(`/org/${ctx.orgSlug}`)

  const platform = await getPlatformClient()
  let wizardProps: ComponentProps<typeof OnboardingWizard> | null = null

  if (ctx) {
    const [orgCatalog, appCatalog, orgSession, appSession] = await Promise.all([
      platform.onboarding.retrieveCatalog(
        'organization',
        ORGANIZATION_TARGET_KEY,
        ONBOARDING_COUNTRY
      ),
      platform.onboarding.retrieveCatalog(
        'application',
        COURIERS_APP_SLUG,
        ONBOARDING_COUNTRY
      ),
      platform.onboarding.retrieve(
        ctx.orgId,
        'organization',
        ORGANIZATION_TARGET_KEY,
        ONBOARDING_COUNTRY
      ),
      platform.onboarding.retrieve(
        ctx.orgId,
        'application',
        COURIERS_APP_SLUG,
        ONBOARDING_COUNTRY
      ),
    ])

    if (!orgCatalog.error && !appCatalog.error) {
      wizardProps = {
        needsOrg: false,
        orgName: ctx.orgName ?? '',
        orgCatalog: orgCatalog.data,
        appCatalog: appCatalog.data,
        initialOrgAnswers: orgSession.data?.answers ?? {},
        initialAppAnswers: appSession.data?.answers ?? {},
      }
    }
  } else {
    const memberships = await platform.auth.getRoutingMemberships({
      userId: session.user.id,
    })

    if (!memberships.error) {
      if (memberships.data.data.length > 0) redirect('/no-access')

      const [orgCatalog, appCatalog] = await Promise.all([
        platform.onboarding.retrieveCatalog(
          'organization',
          ORGANIZATION_TARGET_KEY,
          ONBOARDING_COUNTRY
        ),
        platform.onboarding.retrieveCatalog(
          'application',
          COURIERS_APP_SLUG,
          ONBOARDING_COUNTRY
        ),
      ])

      if (!orgCatalog.error && !appCatalog.error) {
        wizardProps = {
          needsOrg: true,
          orgName: '',
          orgCatalog: orgCatalog.data,
          appCatalog: appCatalog.data,
          initialOrgAnswers: {},
          initialAppAnswers: {},
        }
      }
    }
  }

  const catalogError = wizardProps === null

  return (
    <OnboardingShell>
      {catalogError || !wizardProps ? (
        <SetupUnavailable />
      ) : (
        <OnboardingWizard {...wizardProps} />
      )}
    </OnboardingShell>
  )
}
