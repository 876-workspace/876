import { buttonVariants } from '@876/ui/button'
import { ArrowLeft } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import Link from 'next/link'

import { PLATFORM_PROJECTS_BASE } from '../../_lib/base'

export const metadata = { title: 'New Issue • Issues' }

export default function PlatformNewIssuePage() {
  const base = `${PLATFORM_PROJECTS_BASE}/issues`

  return (
    <Page className="space-y-6">
      <Link
        href={base}
        className={buttonVariants({
          variant: 'outline',
          size: 'sm',
          className: 'inline-flex items-center gap-1.5',
        })}
      >
        <ArrowLeft className="size-3.5" />
        Back to issues
      </Link>

      <div className="876-card max-w-xl p-6">
        <h1 className="text-lg font-semibold">Create a new issue</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Issues belong to a project and track features, bugs, and tasks.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={base}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Cancel
          </Link>
        </div>
      </div>
    </Page>
  )
}
