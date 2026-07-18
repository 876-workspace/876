import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offline | 876',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md space-y-3">
        <p className="text-muted-foreground text-sm font-medium">Offline</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          You are offline
        </h1>
        <p className="text-muted-foreground">
          Reconnect to continue using the app.
        </p>
      </div>
    </main>
  )
}
