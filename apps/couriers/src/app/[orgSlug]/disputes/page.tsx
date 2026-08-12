import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { DisputesTable } from './_components/disputes-table'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function DisputesPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <ResourceToolbar
        title="Disputes"
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/disputes/new`}
        primaryVariant="info"
        refresh
      />

      <DisputesTable />
    </Page>
  )
}
