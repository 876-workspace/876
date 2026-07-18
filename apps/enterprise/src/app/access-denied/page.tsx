import type { Metadata } from 'next'
import Link from 'next/link'
import { ChangeAccountAction } from './change-account-action'

export const metadata: Metadata = {
  title: 'Wrong account | 876',
  robots: { index: false, follow: false },
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/**
 * Hard block shown when a consumer-realm (personal) session reaches the
 * enterprise workspace. Only enterprise accounts may use this app. We do NOT
 * auto-redirect — the user must explicitly switch accounts.
 */
export default function AccessDeniedPage() {
  return (
    <main className="bg-background text-foreground grid min-h-dvh place-items-center px-4 py-10">
      <section className="border-border/70 bg-card w-full max-w-md rounded-[1.5rem] border p-6 text-center shadow-[0_24px_70px_rgb(15_23_42_/_10%)]">
        <h1 className="text-lg font-semibold tracking-[-0.03em]">
          This workspace needs a work account
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          You&apos;re signed in with a personal 876 account. The enterprise
          workspace can only be used with a work (enterprise) account. Change to
          a work account, or go to your personal 876 account.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ChangeAccountAction />
          <Link
            href={APP_URL}
            className="border-border bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-semibold transition-colors"
          >
            Go to my 876 account
          </Link>
        </div>
      </section>
    </main>
  )
}
