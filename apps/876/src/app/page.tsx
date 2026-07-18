import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '876',
  robots: { index: false, follow: false },
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to 876</h1>
        <p className="text-muted-foreground text-lg">
          One identity. Every 876 product.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/register"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-12 min-w-[200px] items-center justify-center rounded-lg px-8 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          Sign up — Consumer
        </Link>

        <Link
          href="/enterprise/login"
          className="border-border bg-background text-foreground hover:bg-accent focus-visible:ring-ring inline-flex h-12 min-w-[200px] items-center justify-center rounded-lg border px-8 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          Sign in — Enterprise
        </Link>
      </div>

      <p className="text-muted-foreground text-sm">
        Already have a consumer account?{' '}
        <Link
          href="/login?returnTo=/app"
          className="underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </main>
  )
}
