import { notFound } from 'next/navigation'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { findModule } from '@876/settings'

import { COURIERS_MODULE_CATALOG } from '@/lib/modules'

type Props = { params: Promise<{ orgSlug: string; moduleKey: string }> }

export async function generateMetadata({ params }: Props) {
  const { moduleKey } = await params
  const moduleDefinition = findModule(COURIERS_MODULE_CATALOG, moduleKey)

  return { title: `${moduleDefinition?.label ?? 'Module'} — Settings` }
}

/**
 * One route serves every module's preferences, driven by the catalog, so adding a
 * module to the catalog adds its settings page without a new file.
 */
export default async function ModuleSettingsPage({ params }: Props) {
  const { orgSlug, moduleKey } = await params

  const moduleDefinition = findModule(COURIERS_MODULE_CATALOG, moduleKey)
  if (!moduleDefinition) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>{moduleDefinition.label}</PageTitle>
      </PageHeader>

      <div className="876-empty-dashed max-w-2xl">Coming soon.</div>
    </Page>
  )
}
