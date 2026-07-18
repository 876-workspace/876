'use client'

import React from 'react'
import type { ReactNode } from 'react'

import Link from 'next/link'
import {
  Building2,
  CreditCard,
  Home,
  LayoutList,
  MapPin,
  Settings,
  ShieldCheck,
  User,
  UserRoundCheck,
  Users,
  type IconComponent,
} from '@876/ui/icons'
import { Logo } from '@876/ui/logo'

import { $876 } from '@/lib/876'
import { useUserStore } from '@/stores/user'
import { EnterpriseNavLink } from './enterprise-nav-link'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from '@876/ui/sidebar'
import {
  SidebarUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'

export type EnterpriseSidebarUser = SidebarUserMenuUser

type EnterpriseNavItem = {
  title: string
  href: string
  icon: IconComponent
  color: string
  featureSlug?: string
  /** Org permission required to see this item (e.g. `billing:read`). */
  permission?: string
}

type EnterpriseNavGroup = {
  label: string
  items: EnterpriseNavItem[]
}

export function EnterpriseSidebar({
  organization,
  enabledFeatureSlugs = [],
  permissions = [],
  appsSlot,
  user,
}: {
  organization: { name: string | null; slug: string }
  enabledFeatureSlugs?: string[]
  permissions?: string[]
  appsSlot?: ReactNode
  user: EnterpriseSidebarUser
}) {
  const baseHref = `/${organization.slug}`
  const enabledSet = new Set(enabledFeatureSlugs)
  const permissionSet = new Set(permissions)
  const settingsHref = `${baseHref}/settings`
  const navGroups = getEnterpriseNavGroups(baseHref)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.featureSlug || enabledSet.has(item.featureSlug)) &&
          (!item.permission || permissionSet.has(item.permission))
      ),
    }))
    .filter((group) => group.items.length > 0)
  const settingsItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.href === settingsHref)

  async function handleSignOut() {
    useUserStore.getState().clearUser()
    await $876.auth.logout()
    window.location.href = '/login'
  }

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href={baseHref}
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="border-sidebar-border flex size-8 shrink-0 items-center justify-center rounded-xl border">
            <Logo className="text-sm leading-none text-[#202124] dark:text-white" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-lg leading-6 font-medium tracking-[-0.02em] text-[#202124] dark:text-white">
              Enterprise
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4">
        <nav
          aria-label="Organization sections"
          className="flex flex-1 flex-col gap-4"
        >
          {navGroups.map((group, index) => {
            const items = group.items.filter(
              (item) => item.href !== settingsHref
            )
            if (items.length === 0) return null

            return (
              <React.Fragment key={group.label}>
                <SidebarGroup className="gap-1.5 p-0">
                  <SidebarGroupLabel className="uppercase">
                    {group.label}
                  </SidebarGroupLabel>
                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <EnterpriseNavLink
                        key={item.href}
                        href={item.href}
                        title={item.title}
                        icon={item.icon}
                        color={item.color}
                      />
                    ))}
                  </div>
                </SidebarGroup>

                {index === 0 && appsSlot}
              </React.Fragment>
            )
          })}

          {settingsItem ? (
            <div className="mt-auto">
              <EnterpriseNavLink
                href={settingsItem.href}
                title={settingsItem.title}
                icon={settingsItem.icon}
                color={settingsItem.color}
              />
            </div>
          ) : null}
        </nav>
      </SidebarContent>

      <SidebarUserMenu
        user={user}
        onSignOut={handleSignOut}
        showSystemTheme={false}
      />
    </Sidebar>
  )
}

function getEnterpriseNavGroups(baseHref: string): EnterpriseNavGroup[] {
  return [
    {
      label: 'Account',
      items: [
        {
          title: 'Home',
          href: baseHref,
          icon: Home,
          color: 'var(--876-blue)',
          featureSlug: 'enterprise_overview',
        },
        {
          title: 'Profile',
          href: `${baseHref}/profile`,
          icon: User,
          color: 'var(--876-purple)',
        },
        {
          title: 'Security',
          href: `${baseHref}/security`,
          icon: ShieldCheck,
          color: 'var(--876-red)',
        },
      ],
    },
    {
      label: 'Organization',
      items: [
        {
          title: 'Organization',
          href: `${baseHref}/organization`,
          icon: Building2,
          color: 'var(--876-gold)',
        },
        {
          title: 'Locations',
          href: `${baseHref}/locations`,
          icon: MapPin,
          color: 'var(--876-green)',
          permission: 'structure:read',
        },
        {
          title: 'Departments',
          href: `${baseHref}/departments`,
          icon: LayoutList,
          color: 'var(--876-blue)',
          permission: 'structure:read',
        },
        {
          title: 'People',
          href: `${baseHref}/people`,
          icon: UserRoundCheck,
          color: 'var(--876-purple)',
          permission: 'structure:read',
        },
        {
          title: 'Members',
          href: `${baseHref}/members`,
          icon: Users,
          color: 'var(--876-green)',
          featureSlug: 'enterprise_members',
          permission: 'members:read',
        },
        {
          title: 'Billing',
          href: `${baseHref}/billing`,
          icon: CreditCard,
          color: 'var(--876-gold)',
          featureSlug: 'enterprise_billing',
          permission: 'billing:read',
        },
        {
          title: 'Settings',
          href: `${baseHref}/settings`,
          icon: Settings,
          color: 'var(--876-orange)',
          featureSlug: 'enterprise_settings',
          permission: 'org:update',
        },
      ],
    },
  ]
}
