import { IntegrationClientList } from '@876/projects-ui/platform/integration-client-list'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { toUiIntegrationClient } from '@/lib/integration-mappers'
import { integration } from '@/lib/services/integration'

import { IntegrationClientsManager } from './_components/integration-clients-manager'

export const metadata = { title: 'Integrations' }

export default async function IntegrationsPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const result = await integration.listClients(orgId)

  const clients = (result.data ?? []).map(toUiIntegrationClient)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="876-page-title">Integrations</h1>
        <Link
          href="/settings/integrations/new"
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          New client
        </Link>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Integration clients call the Projects API with scoped credentials. Secrets
        are shown once when a client is created and never again.
      </p>
      {result.error ? (
        <div className="mb-4">
          <AppError
            title="Integration clients could not be loaded"
            error={result.error}
            variant="banner"
          />
        </div>
      ) : null}
      <div className="flex max-w-3xl flex-col gap-6">
        <IntegrationClientList
          clients={clients}
          revokeActionBase="/api/integration-clients"
        />
        <IntegrationClientsManager clients={clients} />
      </div>
    </div>
  )
}
