import { Page } from '@876/ui/page'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <Page>
      <h1 className="876-page-title">Settings</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        CRM categories, workspace preferences, and plan-facing limits will live here as those capabilities are added.
      </p>
    </Page>
  )
}
