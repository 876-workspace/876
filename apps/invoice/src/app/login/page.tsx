export default function LoginPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border p-6 text-center">
        <h1 className="text-xl font-semibold">Sign in to 876 Invoice</h1>
        <p className="text-muted-foreground text-sm">
          You will be redirected to 876 to sign in.
        </p>
        <a
          href={`${appUrl}/login?return_to=${encodeURIComponent('/')}`}
          className="bg-primary text-primary-foreground inline-flex rounded-md px-4 py-2 text-sm"
        >
          Continue to 876
        </a>
      </div>
    </div>
  )
}
