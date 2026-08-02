import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'

export function SubscriptionDetailActions({ id }: { id: string }) {
  const base = `/subscriptions/${encodeURIComponent(id)}`

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`${base}/charges/new`}
        className={buttonVariants({ variant: 'outline' })}
      >
        Add charge
      </Link>
      <Link
        href={`${base}/edit`}
        className={buttonVariants({ variant: 'outline' })}
      >
        Change subscription
      </Link>
      <Link
        href={`${base}/manage`}
        className={buttonVariants({ variant: 'info' })}
      >
        Manage
      </Link>
    </div>
  )
}
