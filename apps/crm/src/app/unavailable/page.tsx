export default function UnavailablePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <div className="w-full space-y-3 rounded-xl border p-6 text-center">
        <h1 className="876-page-title">876 CRM is temporarily unavailable</h1>
        <p className="text-muted-foreground text-sm">
          We could not verify your organization right now. Please try again
          shortly.
        </p>
      </div>
    </main>
  )
}
