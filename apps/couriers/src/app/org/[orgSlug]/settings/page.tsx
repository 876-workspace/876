import { Page } from '@876/ui/page'

import { SettingsCard } from './settings-card'
import { SETTINGS_NAV } from './settings-groups'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page hub>
      <h1 className="876-page-title mb-5 text-center">Settings</h1>

      {/* Multi-column rather than a grid: cards are deliberately different
          heights, and the browser balances the columns itself at every
          breakpoint. A grid would need each group assigned to a column by
          hand, which goes stale the moment a group is added or grows. */}
      <div className="mx-auto max-w-6xl gap-6 sm:columns-2 lg:columns-3">
        {SETTINGS_NAV.map((group) => (
          <SettingsCard key={group.key} group={group} orgSlug={orgSlug} />
        ))}
      </div>
    </Page>
  )
}
