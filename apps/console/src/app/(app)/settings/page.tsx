import Link from 'next/link'

import { SETTINGS_SECTIONS } from '@/components/console-nav-config'
import { Page } from '@876/ui/page'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <Page hub>
      <div className="mb-8">
        <h1 className="text-lg font-medium">Settings</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Configure access, permissions, and platform behaviour.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="876-card 876-card-interactive group p-5 transition-colors"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="876-icon-tile">
                  <Icon className={`${section.iconColor} size-4`} />
                </span>
                <span className="font-medium">{section.title}</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {section.description}
              </p>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
