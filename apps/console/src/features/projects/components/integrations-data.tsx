import { IntegrationClientList } from '@876/projects-ui/platform/integration-client-list'
import { AppError } from '@876/ui/app-error'

import { toUiIntegrationClient } from '../projects-integration-mappers'
import { projects } from '@/lib/services/projects'

/**
 * The data half of the Integrations list, shared by every host.
 * Read-only: integration clients without secrets. The client secret is only
 * ever returned on creation and is never listed, so this view cannot leak it.
 * No revoke affordance — `canEdit` stays false.
 */
export async function IntegrationsData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  const result =
    await projects.integrationClients.list(organizationId)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Integration data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <IntegrationClientList
        clients={(result.data ?? []).map(toUiIntegrationClient)}
        revokeActionBase={`${base}/integrations`}
      />
    </div>
  )
}
