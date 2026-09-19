import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { WEBHOOK_EVENT_OPTIONS } from '@/lib/integration-mappers'
import { integration } from '@/lib/clients/integration'

import { WebhookEditForm } from './_components/webhook-edit-form'

export const metadata = { title: 'Edit webhook endpoint' }

type Props = { params: Promise<{ endpointId: string }> }

export default async function EditWebhookEndpointPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  await requireProjectsContext()
  const { endpointId } = await params
  const decodedId = decodeURIComponent(endpointId)
  const result = await integration.retrieveWebhookEndpoint(decodedId)

  if (result.error?.code === 'projects/webhook-endpoint-not-found') notFound()
  if (result.error || !result.data)
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <PageBreadcrumb
          href={`/settings/webhooks/${encodeURIComponent(decodedId)}`}
          label="Endpoint"
          className="mb-4"
        />
        <AppError
          title="The endpoint could not be loaded"
          error={
            result.error ?? {
              code: 'projects/webhook-unavailable',
              message: 'The endpoint could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/settings/webhooks/${encodeURIComponent(result.data.id)}`}
        label="Endpoint"
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">Edit endpoint</h1>
      <p className="text-muted-foreground mb-6 text-sm font-mono break-all">
        {result.data.url}
      </p>
      <div className="max-w-3xl">
        <WebhookEditForm
          endpointId={result.data.id}
          initialUrl={result.data.url}
          initialEventTypes={result.data.eventTypes}
          initialEnabled={result.data.enabled}
          eventOptions={[...WEBHOOK_EVENT_OPTIONS]}
        />
      </div>
    </div>
  )
}
