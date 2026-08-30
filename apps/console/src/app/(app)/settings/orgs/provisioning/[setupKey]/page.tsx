import { notFound } from 'next/navigation'

import { getProvisioningSetup } from './_data'

export const metadata = { title: 'Provisioning setup' }

type Props = { params: Promise<{ setupKey: string }> }

export default async function ProvisioningSetupPage({ params }: Props) {
  const { setupKey } = await params

  const result = await getProvisioningSetup(setupKey)
  if (result.error || !result.data) notFound()
  const setup = result.data
  return (
    <div className="space-y-4">
      <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
        <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
          Setup Details
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Country</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {setup.country_code ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Currency</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {setup.currency_code ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Published Revision
            </dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {setup.published_revision ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Organizations</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {setup.organization_count}
            </dd>
          </div>
        </dl>
      </div>
      {setup.description ? (
        <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
          <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
            Description
          </h3>
          <p className="text-foreground text-[0.8125rem]">
            {setup.description}
          </p>
        </div>
      ) : null}
    </div>
  )
}
