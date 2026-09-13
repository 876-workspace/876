import Link from 'next/link'
export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <div className="w-full space-y-3 rounded-xl border p-6">
        <h1 className="876-page-title">Set up 876 Commerce</h1>
        <p className="text-muted-foreground text-sm">
          An organization administrator can enable 876 Commerce for this
          workspace.
        </p>
        <Link href="/login" className="text-sm underline">
          Change account
        </Link>
      </div>
    </main>
  )
}
