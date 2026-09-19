import Link from 'next/link'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export const metadata = { title: 'Workflows' }

export default async function WorkflowsPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const result = await projects.workItemTypes.list(orgId)
  const types = result.data?.data ?? []

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-2">Workflows</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Each work item type has a blueprint: the transitions its states allow.
        Until the first transition is added, every state change stays allowed.
      </p>
      {result.error ? (
        <p role="status" className="text-muted-foreground text-sm">
          Work item types could not be loaded.
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {types.map((type) => (
          <li
            key={type.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3"
          >
            <span className="text-sm font-medium">{type.name}</span>
            <Link
              href={`/settings/workflows/${encodeURIComponent(type.id)}`}
              className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Edit blueprint
            </Link>
          </li>
        ))}
      </ul>
      {types.length === 0 && !result.error ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No work item types yet
        </p>
      ) : null}
    </div>
  )
}
