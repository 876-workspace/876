import { Page } from '@876/ui/page'
import { settingsNavSections } from '@876/settings/nav'

import { SettingsCard } from './settings-card'
import { SETTINGS_NAV } from './settings-groups'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const sections = settingsNavSections(SETTINGS_NAV)

  return (
    <Page hub>
      <h1 className="mb-6 text-center text-xl font-semibold">Settings</h1>

      <div className="space-y-10 lg:max-w-5xl">
        {sections.map((section) => (
          <section key={section.section || 'default'}>
            {section.section ? (
              <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                {section.section}
              </h2>
            ) : null}

            {/* No items-start here: the grid stretches every card in a row to
                the tallest, so a five-item card never sits beside a ragged
                short one. Sections keep those rows evenly sized in the first
                place. */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {section.groups.map((group) => (
                <SettingsCard key={group.key} group={group} orgSlug={orgSlug} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  )
}
