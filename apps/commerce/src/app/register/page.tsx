import Link from 'next/link'
export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <div className="w-full space-y-3 rounded-xl border p-6">
        <h1 className="876-page-title">Create a Commerce workspace</h1>
        <p className="text-muted-foreground text-sm">
          Sign in first, then set up your organization.
        </p>
        <Link href="/login" className="text-sm underline">
          Sign in
        </Link>
      </div>
    </main>
  )
}
