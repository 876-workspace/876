import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'

export function PlatformUnavailable() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="876-page-title">
          876 Invoice is temporarily unavailable
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          We could not verify your organization with 876. Your workspace has not
          been reset or removed.
        </p>
      </div>
      <div>
        <Link
          href="/"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Try again
        </Link>
      </div>
    </div>
  )
}
