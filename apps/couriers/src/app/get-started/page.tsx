import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { SwitchAccountLink } from '@/components/switch-account-link'
import { getManageContext } from '@/lib/auth/manage-context'

import { SetupButton } from './setup-button'
import { PageHeader, PageTitle, PageDescription } from '@876/ui/page'

export const metadata: Metadata = {
  title: '876 Couriers',
  robots: { index: false, follow: false },
}

export default async function GetStartedPage() {
  const ctx = await getManageContext()

  if (!ctx) {
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=/get-started`)
  }

  if (ctx.accessStatus === 'active') {
    redirect('/')
  }

  if (ctx.accessStatus === 'blocked' || ctx.role === 'member') {
    redirect('/no-access')
  }

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        {/* App identity */}
        <div className="mb-8 text-center">
          <div className="border-border bg-card mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border shadow-sm">
            <TruckIcon />
          </div>
          <p className="876-eyebrow">876 Couriers</p>
        </div>

        {/* Headline */}
        <PageHeader className="mb-8 text-center">
          <PageTitle className="text-foreground mb-2">
            Courier management
            <br />
            for your team
          </PageTitle>
          <PageDescription className="text-sm leading-relaxed">
            Manage packages, customers, and deliveries from one workspace.
          </PageDescription>
        </PageHeader>

        {/* Feature highlights */}
        <ul className="mb-8 space-y-3">
          {FEATURES.map((f) => (
            <li key={f.label} className="flex items-start gap-3">
              <CheckIcon />
              <div>
                <span className="text-foreground text-sm font-medium">
                  {f.label}
                </span>
                <span className="text-muted-foreground text-sm">
                  {' '}
                  — {f.description}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="space-y-3">
          <SetupButton />
          <SwitchAccountLink className="text-muted-foreground hover:text-foreground flex h-9 w-full items-center justify-center text-sm transition-colors" />
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    label: 'Packages',
    description: 'Track every shipment from pickup to delivery',
  },
  {
    label: 'Customers',
    description: 'Central address book for senders and recipients',
  },
  {
    label: 'Manifests',
    description: 'Group packages into driver runs with one click',
  },
]

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7"
      aria-hidden
    >
      <path d="M1 3h13v12H1z" />
      <path d="M14 7h4l3 4v5h-7V7z" />
      <circle cx="5.5" cy="17.5" r="2.5" />
      <circle cx="18.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground mt-0.5 size-4 shrink-0"
      aria-hidden
    >
      <circle cx="8" cy="8" r="7" />
      <path d="M5 8l2 2 4-4" />
    </svg>
  )
}
