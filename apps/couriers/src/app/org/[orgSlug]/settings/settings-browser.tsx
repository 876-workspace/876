'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import {
  BuildingOffice2Icon,
  CreditCardIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'

type SettingsItem = {
  title: string
  /** Present when the page exists — the item renders as a link. */
  href?: string
}

type SettingsGroup = {
  title: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  items: SettingsItem[]
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: 'Organization',
    icon: BuildingOffice2Icon,
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
    items: [
      { title: 'Team', href: '/settings/team' },
      { title: 'Roles' },
      { title: 'User preferences' },
    ],
  },
  {
    title: 'Setup & configuration',
    icon: Cog6ToothIcon,
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
    items: [{ title: 'Billing', href: '/settings/billing' }],
  },
]

export function SettingsBrowser({ orgSlug }: { orgSlug: string }) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SETTINGS_GROUPS

    return SETTINGS_GROUPS.map((group) => {
      const groupMatches = group.title.toLowerCase().includes(q)
      const items = groupMatches
        ? group.items
        : group.items.filter((item) => item.title.toLowerCase().includes(q))
      return { ...group, items }
    }).filter((group) => group.items.length > 0)
  }, [query])

  return (
    <>
      <div className="relative mb-10 max-w-md">
        <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search settings"
          aria-label="Search settings"
          className="pl-9"
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No settings match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
          {groups.map((group) => {
            const Icon = group.icon
            return (
              <section key={group.title} className="876-card p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <Icon className="text-muted-foreground size-5" />
                  <h2 className="text-[15px] font-medium">{group.title}</h2>
                </div>
                <ul className="space-y-3.5 ps-[30px]">
                  {group.items.map((item) =>
                    item.href ? (
                      <li key={item.title}>
                        <Link
                          href={`/org/${orgSlug}${item.href}`}
                          className="text-foreground/90 hover:text-primary text-sm transition-colors"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ) : (
                      <li
                        key={item.title}
                        className="text-muted-foreground/45 text-sm"
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
      )}
    </>
  )
}
