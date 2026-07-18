import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { SwitchAccountLink } from '@/components/switch-account-link'
import { getManageContext } from '@/lib/auth/manage-context'

export const metadata: Metadata = {
  title: '876 Couriers',
  robots: { index: false, follow: false },
}

export default async function NoAccessPage() {
  const ctx = await getManageContext()

  if (ctx?.accessStatus === 'active' && ctx.role !== 'member') {
    redirect('/')
  }

  const content = deriveContent(ctx)

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6">
      <div className="mx-auto w-full max-w-sm space-y-6 text-center">
        <div className="space-y-4">
          <div className="border-border bg-card mx-auto flex size-14 items-center justify-center rounded-2xl border shadow-sm">
            <TruckIcon />
          </div>
          <p className="876-eyebrow">876 Couriers</p>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {content.heading}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {content.body}
          </p>
        </div>

        <SwitchAccountLink className="text-muted-foreground hover:text-foreground inline-flex h-9 w-full items-center justify-center text-sm transition-colors" />
      </div>
    </main>
  )
}

type Content = { heading: string; body: string }

function deriveContent(
  ctx: Awaited<ReturnType<typeof getManageContext>>
): Content {
  if (!ctx) {
    return {
      heading: 'Sign in to continue',
      body: 'You need to sign in with a work account to access 876 Couriers.',
    }
  }

  if (ctx.accessStatus === 'blocked') {
    return {
      heading: 'Access has been restricted',
      body: "Your organization's access to 876 Couriers has been suspended. Contact your admin for help.",
    }
  }

  if (ctx.accessStatus === 'none') {
    return {
      heading: '876 Couriers isn’t set up for your organization',
      body: 'Your organization hasn’t activated 876 Couriers yet. Ask your owner or admin to create a workspace.',
    }
  }

  // accessStatus === 'active' but role === 'member'
  return {
    heading: 'You don’t have access to this workspace',
    body: 'Your account doesn’t have permission to use 876 Couriers. Contact your organization admin.',
  }
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M1 3h13v12H1z" />
      <path d="M14 7h4l3 4v5h-7V7z" />
      <circle cx="5.5" cy="17.5" r="2.5" />
      <circle cx="18.5" cy="17.5" r="2.5" />
    </svg>
  )
}
