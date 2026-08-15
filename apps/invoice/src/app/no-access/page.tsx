export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-3 rounded-lg border p-6">
        <h1 className="text-lg font-semibold">No access</h1>
        {reason === 'subscription' ? (
          <p className="text-sm text-muted-foreground">
            Your organization does not have an active 876 Invoice subscription. Contact your admin or subscribe to continue.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not have access to 876 Invoice with this account or organization.
          </p>
        )}
        <p className="text-sm text-muted-foreground">If your workspace is still provisioning, please try again shortly.</p>
      </div>
    </div>
  )
}
