import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { $876 } from '@/lib/876'
import type { FormField } from '@/types/form'

export const metadata = { title: 'New Product' }

export default async function NewProductPage() {
  await requirePagePermission('catalog:write')

  const apps = await $876.apps.list({ limit: 100 })
  const appOptions = (apps.data?.data ?? [])
    .filter((app) => app.app_kind === 'product')
    .map((app) => ({ label: `${app.name} (${app.slug})`, value: app.id }))

  const sourceAppField: FormField =
    appOptions.length > 0
      ? {
          name: 'sourceAppId',
          label: '876 app (optional)',
          type: 'select',
          options: appOptions,
          description:
            'Links this product to a platform app for Console sync. Leave unset for an external product.',
        }
      : {
          name: 'sourceAppId',
          label: '876 app ID (optional)',
          type: 'text',
          description:
            'Opaque reference only; it does not grant features or access.',
        }

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/products"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Products
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Product</span>
      </nav>

      <PageHeader>
        <PageTitle>New Product</PageTitle>
        <PageDescription>
          Create a subscription product to group plans and related pricing.
        </PageDescription>
      </PageHeader>

      <CreateForm
        title="Product"
        endpoint="/api/v1/products"
        returnUrl="/products"
        fields={[
          {
            name: 'slug',
            label: 'Identifier',
            type: 'text',
            required: true,
            placeholder: 'couriers',
            description: 'Lowercase letters, numbers, and hyphens only.',
          },
          { name: 'name', label: 'Name', type: 'text', required: true },
          {
            name: 'description',
            label: 'Description',
            type: 'text',
            description: 'Shown on product and checkout surfaces.',
          },
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            required: true,
            initialValue: 'SERVICE',
            options: [
              { label: 'Service', value: 'SERVICE' },
              { label: 'Good', value: 'GOOD' },
            ],
          },
          sourceAppField,
          {
            name: 'redirectUrl',
            label: 'Post-checkout redirect URL',
            type: 'text',
          },
          {
            name: 'notificationRecipients',
            label: 'Notification recipients',
            type: 'text',
            description: 'Comma-separated operational recipients.',
          },
        ]}
      />
    </Page>
  )
}
