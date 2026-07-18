import Link from 'next/link'
import { Waves, CreditCardIcon, Cog6ToothIcon, UsersIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

const SETTINGS_SECTIONS = [
  {
    title: 'General',
    description:
      'Organization name, currency, subdomain, and regional defaults.',
    href: '/settings/general',
    icon: Cog6ToothIcon,
    iconColor: 'text-muted-foreground',
  },
  {
    title: 'Team',
    description: 'Manage staff accounts and control who has access.',
    href: '/settings/team',
    icon: UsersIcon,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Billing',
    description: 'Your plan, payment method, and invoice history.',
    href: '/settings/billing',
    icon: CreditCardIcon,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Notifications',
    description: 'Alert channels and delivery event subscriptions.',
    href: '/settings/notifications',
    icon: Waves,
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
]

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page hub>
      <div className="mb-8">
        <h1 className="text-lg font-medium">Settings</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage your workspace settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={`/org/${orgSlug}${section.href}`}
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
