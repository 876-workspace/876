import { Page } from '@876/ui/page'

import { SettingsCard } from './settings-card'
import { SETTINGS_GROUPS } from './settings-groups'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page hub>
      <h1 className="mb-5 text-center text-xl font-semibold">Settings</h1>

      <div className="grid items-start gap-6 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
        {SETTINGS_GROUPS.map((group) => (
          <SettingsCard key={group.title} group={group} orgSlug={orgSlug} />
        ))}
      </div>
    </Page>
  )
}
