import { Page } from '@876/ui/page'
import Link from 'next/link'

import { resolveNavIcon } from '@/components/shell/nav-icons'
import { resolveSettingsOptions } from '@/components/shell/settings-options'
import { resolveAccessContext } from '@/lib/auth/access-context'
import { requireConsolePermission, requireSession } from '@/lib/auth/guards'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await requireSession('/settings')
  await requireConsolePermission(user.id, 'console:settings')
  const context = await resolveAccessContext(user.id)
  const options = context ? resolveSettingsOptions(context) : []

  return (
    <Page hub>
      <div className="mb-8">
        <h1 className="text-lg font-medium">Settings</h1>
        <p className="text-muted-foreground mt-0.5 text-[0.8125rem]">
          Configure access, permissions, and platform behaviour.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((section) => {
          const Icon = resolveNavIcon(section.icon)
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
              <p className="text-muted-foreground text-[0.8125rem] leading-relaxed">
                {section.description}
              </p>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
