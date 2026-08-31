import { notFound, redirect } from 'next/navigation'

import { getProvisioningCatalog } from './_data'
import { getDefinitionType } from './setup-type-utils'

type Props = { params: Promise<{ setupKey: string }> }

/**
 * The bare `/settings/orgs/provisioning/[setupKey]` route redirects to the
 * first resource-type tab so the URL always reflects the active category.
 */
export default async function ProvisioningSetupIndexPage({ params }: Props) {
  const { setupKey } = await params
  const result = await getProvisioningCatalog(setupKey)
  if (result.error || !result.data) notFound()

  const firstType = result.data.resource_types[0]
  if (!firstType) notFound()

  redirect(
    `/settings/orgs/provisioning/${encodeURIComponent(setupKey)}/${encodeURIComponent(getDefinitionType(firstType))}`
  )
}
