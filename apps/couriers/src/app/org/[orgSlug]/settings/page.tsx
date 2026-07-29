import { Page } from '@876/ui/page'

import { SettingsCard } from './settings-card'
import { SETTINGS_NAV } from './settings-groups'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  // Stack settings cards across 3 visual columns to eliminate height imbalances.
  const column1Keys = new Set(['organization', 'users'])
  const column2Keys = new Set(['modules_core', 'modules_ops', 'portal'])
  const column3Keys = new Set([
    'rates',
    'customization',
    'communication',
    'automation',
    'billing',
  ])

  const col1 = SETTINGS_NAV.filter((g) => column1Keys.has(g.key))
  const col2 = SETTINGS_NAV.filter((g) => column2Keys.has(g.key))
  const col3 = SETTINGS_NAV.filter((g) => column3Keys.has(g.key))

  return (
    <Page hub>
      <h1 className="mb-5 text-center text-xl font-semibold">Settings</h1>

      <div className="grid items-start gap-6 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          {col1.map((group) => (
            <SettingsCard key={group.key} group={group} orgSlug={orgSlug} />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          {col2.map((group) => (
            <SettingsCard key={group.key} group={group} orgSlug={orgSlug} />
          ))}
        </div>
        <div className="flex flex-col gap-6 sm:col-span-2 lg:col-span-1">
          {col3.map((group) => (
            <SettingsCard key={group.key} group={group} orgSlug={orgSlug} />
          ))}
        </div>
      </div>
    </Page>
  )
}
