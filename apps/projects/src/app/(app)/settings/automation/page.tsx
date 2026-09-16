import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

import { AutomationRulesManager } from './_components/automation-rules-manager'

export const metadata = { title: 'Automation rules' }

export default async function AutomationPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const result = await projects.automationRules.list(orgId)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="876-page-title">Automation rules</h1>
        <Link
          href="/settings/automation/new"
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          New rule
        </Link>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Rules react to work events — created, updated, state changed — and run
        actions such as assigning, labeling, reminding, or notifying.
      </p>
      {result.error ? (
        <div className="mb-4">
          <AppError
            title="Automation rules could not be loaded"
            error={result.error}
            variant="banner"
          />
        </div>
      ) : null}
      <AutomationRulesManager
        initial={result.data?.data ?? []}
        hrefBase="/settings/automation"
      />
    </div>
  )
}
