import { Page } from '@876/ui/page'

import { getManageContext } from '@/lib/auth/manage-context'
import { SettingsBrowser } from './settings-browser'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  const orgName = ctx?.orgName ?? null

  return (
    <Page hub>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        {orgName ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{orgName}</p>
        ) : null}
      </div>

      <SettingsBrowser orgSlug={orgSlug} />
    </Page>
  )
}
