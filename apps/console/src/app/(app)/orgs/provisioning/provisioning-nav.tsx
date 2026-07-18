import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { cn } from '@876/core/utils'

export function ProvisioningNav({ current }: { current: 'defaults' | 'runs' }) {
  return (
    <nav aria-label="Provisioning views" className="flex flex-wrap gap-2">
      <Link
        href="/orgs/provisioning"
        className={cn(
          buttonVariants({
            variant: current === 'defaults' ? 'default' : 'outline',
          })
        )}
      >
        Shared defaults
      </Link>
      <Link
        href="/orgs/provisioning/runs"
        className={cn(
          buttonVariants({
            variant: current === 'runs' ? 'default' : 'outline',
          })
        )}
      >
        Run history
      </Link>
    </nav>
  )
}
