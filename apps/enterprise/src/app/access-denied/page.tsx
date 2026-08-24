import type { Metadata } from 'next'

import { ChangeAccountAction } from './_components/change-account-action'

export const metadata: Metadata = {
  title: 'Wrong account | 876',
  robots: { index: false, follow: false },
}

/** Consumer accounts cannot enter the Enterprise workspace. */
export default function AccessDeniedPage() {
  return (
    <main className="bg-background text-foreground grid min-h-dvh place-items-center px-4 py-10">
      <section className="border-border/70 bg-card w-full max-w-md rounded-[1.5rem] border p-6 text-center shadow-[0_24px_70px_rgb(15_23_42_/_10%)]">
        <h1 className="text-lg font-semibold tracking-[-0.03em]">
          This workspace needs a work account
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          You&apos;re signed in with a personal 876 account. Sign out, then sign
          in with the Enterprise account for this workspace.
        </p>
        <div className="mt-6 flex justify-center">
          <ChangeAccountAction />
        </div>
      </section>
    </main>
  )
}
