import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export default function NoAccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <div className="w-full space-y-4 rounded-xl border p-6 text-center">
        <h1 className="876-page-title">Projects access unavailable</h1>
        <p className="text-muted-foreground text-sm">
          This organization does not currently allow this account to use 876
          Projects.
        </p>
        <div className="flex justify-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: 'outline' })}
          >
            Change account
          </Link>
          <a href={APP_URL} className={buttonVariants({ variant: 'info' })}>
            Go to my 876 account
          </a>
        </div>
      </div>
    </main>
  )
}
