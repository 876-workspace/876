import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { requireAppAccess } from '@/lib/auth/require-projects-context'
import { WEBHOOK_EVENT_OPTIONS } from '@/lib/integration-mappers'

import { WebhookCreateForm } from './_components/webhook-create-form'

export const metadata = { title: 'New webhook endpoint' }

export default async function NewWebhookEndpointPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/webhooks"
        label="Webhooks"
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">New endpoint</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Endpoints must use https. Pick the events to deliver and whether the
        endpoint starts enabled.
      </p>
      <div className="max-w-3xl">
        <WebhookCreateForm eventOptions={[...WEBHOOK_EVENT_OPTIONS]} />
      </div>
    </div>
  )
}
