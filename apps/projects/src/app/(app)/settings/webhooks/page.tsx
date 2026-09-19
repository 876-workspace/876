import { WebhookEndpointList } from '@876/projects-ui/platform/webhook-endpoint-list'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { toUiWebhookEndpoint } from '@/lib/integration-mappers'
import { integration } from '@/lib/clients/integration'

export const metadata = { title: 'Webhooks' }

export default async function WebhooksPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  await requireProjectsContext()
  const result = await integration.listWebhookEndpoints()

  const endpoints = (result.data?.data ?? []).map(toUiWebhookEndpoint)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="876-page-title">Webhooks</h1>
        <Link
          href="/settings/webhooks/new"
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          New endpoint
        </Link>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Signed https endpoints that receive project events. Rotate a secret when it
        may have leaked — the new value is shown once.
      </p>
      {result.error ? (
        <div className="mb-4">
          <AppError
            title="Webhook endpoints could not be loaded"
            error={result.error}
            variant="banner"
          />
        </div>
      ) : null}
      <div className="flex max-w-3xl flex-col gap-4">
        <WebhookEndpointList endpoints={endpoints} />
        {endpoints.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {endpoints.map((endpoint) => (
              <li key={endpoint.id}>
                <Link
                  href={`/settings/webhooks/${encodeURIComponent(endpoint.id)}`}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {endpoint.url}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
