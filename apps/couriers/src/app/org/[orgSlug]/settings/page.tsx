import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import {
  BuildingOffice2Icon,
  ChevronRightIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  UsersIcon,
} from '@876/ui/icons'
import { Page } from '@876/ui/page'

type SettingsItem = {
  title: string
  /** Present when the page exists — the item renders as a link. */
  href?: string
}

type SettingsGroup = {
  title: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Tailwind classes for the icon tile — one accent hue per group. */
  tileClass: string
  iconClass: string
  items: SettingsItem[]
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: 'Organization',
    icon: BuildingOffice2Icon,
    tileClass: 'bg-blue-500/10',
    iconClass: 'text-blue-600 dark:text-blue-400',
    items: [
      { title: 'Profile', href: '/settings/orgprofile' },
      { title: 'Branding' },
      { title: 'Custom domain' },
      { title: 'Locations' },
      { title: 'Manage subscription' },
    ],
  },
  {
    title: 'Users & roles',
    icon: UsersIcon,
    tileClass: 'bg-violet-500/10',
    iconClass: 'text-violet-600 dark:text-violet-400',
    items: [
      { title: 'Team', href: '/settings/team' },
      { title: 'Roles' },
      { title: 'User preferences' },
    ],
  },
  {
    title: 'Setup & configuration',
    icon: Cog6ToothIcon,
    tileClass: 'bg-amber-500/10',
    iconClass: 'text-amber-600 dark:text-amber-400',
    items: [
      { title: 'General', href: '/settings/general' },
      { title: 'Notifications', href: '/settings/notifications' },
      { title: 'Currencies' },
      { title: 'Address format' },
    ],
  },
  {
    title: 'Billing',
    icon: CreditCardIcon,
    tileClass: 'bg-rose-500/10',
    iconClass: 'text-rose-600 dark:text-rose-400',
    items: [{ title: 'Billing', href: '/settings/billing' }],
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
      <h1 className="mb-10 text-xl font-semibold">Settings</h1>

      <div className="grid items-start gap-6 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
        {SETTINGS_GROUPS.map((group) => {
          const Icon = group.icon
          return (
            <section
              key={group.title}
              className="876-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="mb-4 flex items-center gap-3 border-b pb-4">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${group.tileClass}`}
                >
                  <Icon className={`size-5 ${group.iconClass}`} />
                </span>
                <h2 className="text-[15px] font-semibold">{group.title}</h2>
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) =>
                  item.href ? (
                    <li key={item.title}>
                      <Link
                        href={`/org/${orgSlug}${item.href}`}
                        className="group/item hover:bg-muted -mx-2 flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors"
                      >
                        <span className="text-foreground/90 group-hover/item:text-foreground">
                          {item.title}
                        </span>
                        <ChevronRightIcon className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={item.title}
                      className="text-muted-foreground/45 px-2 py-1.5 text-sm"
                    >
                      {item.title}
                    </li>
                  )
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </Page>
  )
}
