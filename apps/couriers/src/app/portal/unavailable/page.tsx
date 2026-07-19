import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal unavailable',
}

export default function PortalUnavailablePage() {
  return (
    <main className="bg-muted/20 flex min-h-dvh items-center justify-center px-6">
      <div className="bg-card rounded-xl border px-8 py-10 text-center shadow-xs">
        <h1 className="text-xl font-semibold">
          This portal isn&apos;t available
        </h1>
      </div>
    </main>
  )
}
