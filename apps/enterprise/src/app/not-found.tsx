import Link from 'next/link'
import { Building2 } from '@876/ui/icons'

import { buttonVariants } from '@876/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
      <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Building2 className="text-muted-foreground size-7" />
      </div>
      <h1 className="mb-2 text-xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground mb-8 max-w-xs text-sm">
        This page doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Back to home
      </Link>
    </div>
  )
}
