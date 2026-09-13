import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Home' }
export default function HomePage() {
  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <h1 className="876-page-title">Home</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Your store is not set up yet.
      </p>
    </div>
  )
}
