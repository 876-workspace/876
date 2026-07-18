import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

import {
  findAuthRoutingUser,
  requireSession,
  resolvePrimaryOrganizationPath,
} from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Workspace Onboarding | 876',
  robots: { index: false, follow: false },
}

export default async function OrganizationOnboardingPage() {
  const sessionUser = await requireSession('/onboarding')
  const user = await findAuthRoutingUser(sessionUser.id)

  if (!user) redirect('/app')

  const primaryOrganizationPath = await resolvePrimaryOrganizationPath(user.id)
  if (primaryOrganizationPath) redirect(primaryOrganizationPath)

  return (
    <main className="bg-background text-foreground grid min-h-dvh place-items-center px-4 py-10">
      <section className="border-border/70 bg-card max-w-xl rounded-[1.5rem] border p-6 shadow-[0_24px_70px_rgb(15_23_42_/_10%)]">
        <h1 className="text-xl font-semibold tracking-[-0.03em]">
          Organization setup needed
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          No active organization membership is available yet. Ask an
          organization owner to invite you or finish business account setup.
        </p>
      </section>
    </main>
  )
}
