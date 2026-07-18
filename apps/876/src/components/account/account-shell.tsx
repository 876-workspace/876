'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CreditCard,
  Database,
  Globe2,
  Home,
  KeyRound,
  Link2,
  Share2,
  ShieldCheck,
  User,
  Users,
  type IconComponent,
} from '@876/ui/icons'
import type { ReactNode } from 'react'

import { cn } from '@876/core/utils'
import { authClient } from '@/lib/auth/client'
import { useUserStore } from '@/stores/user'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@876/ui/sidebar'
import {
  SidebarUserMenu,
  type SidebarUserMenuUser,
} from '@876/ui/sidebar-user-menu'
import { MobileNavDropdown } from '@876/ui/mobile-nav'

export type AccountShellUser = SidebarUserMenuUser

type AccountNavItem = {
  title: string
  href: string
  icon: IconComponent
  color: string
  featureSlug?: string
}

const accountNavItems: AccountNavItem[] = [
  {
    title: 'Home',
    href: '/app',
    icon: Home,
    color: 'var(--876-blue)',
    featureSlug: 'home',
  },
  {
    title: 'Family',
    href: '/app/family',
    icon: Users,
    color: 'var(--876-green)',
    featureSlug: 'family',
  },
  {
    title: 'Wallet & subscriptions',
    href: '/app/wallet-subscriptions',
    icon: CreditCard,
    color: 'var(--876-green)',
    featureSlug: 'wallet',
  },
  {
    title: 'Personal info',
    href: '/app/personal-info',
    icon: User,
    color: 'var(--876-blue)',
    featureSlug: 'personal_info',
  },
  {
    title: 'Security & sign-in',
    href: '/app/security-sign-in',
    icon: ShieldCheck,
    color: 'var(--876-red)',
    featureSlug: 'security_sign_in',
  },
  {
    title: 'Password',
    href: '/app/password',
    icon: KeyRound,
    color: 'var(--876-gold)',
    featureSlug: 'password',
  },
  {
    title: 'Linked apps',
    href: '/app/linked-apps',
    icon: Link2,
    color: 'var(--876-blue)',
    featureSlug: 'apps',
  },
  {
    title: 'Developer apps',
    href: '/app/developer/apps',
    icon: Globe2,
    color: 'var(--876-green)',
    featureSlug: 'apps',
  },
  {
    title: 'Data & privacy',
    href: '/app/data-privacy',
    icon: Database,
    color: 'var(--876-orange)',
    featureSlug: 'data_privacy',
  },
  {
    title: 'People & sharing',
    href: '/app/people-sharing',
    icon: Share2,
    color: 'var(--876-green)',
    featureSlug: 'people_sharing',
  },
]

export function AccountShell({
  children,
  enabledFeatureSlugs = [],
  user,
}: {
  children: ReactNode
  enabledFeatureSlugs?: string[]
  user: AccountShellUser
}) {
  const enabledSet = new Set(enabledFeatureSlugs)
  const filteredNavItems = accountNavItems.filter(
    (item) => !item.featureSlug || enabledSet.has(item.featureSlug)
  )

  const mobileGroups = [
    {
      items: filteredNavItems.map((item) => ({
        title: item.title,
        href: item.href,
        icon: item.icon,
        color: item.color,
      })),
    },
  ]

  async function handleSignOut() {
    useUserStore.getState().clearUser()
    await authClient.auth.logout()
    window.location.href = '/login'
  }

  return (
    <SidebarProvider>
      <div className="hidden md:contents">
        <Sidebar className="border-sidebar-border bg-sidebar">
          <SidebarHeader className="px-5 pt-5 pb-0">
            <Link href="/app" className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--palette-primary),var(--palette-secondary))] text-[0.625rem] font-bold tracking-[-0.04em] text-white shadow-[0_8px_20px_color-mix(in_oklab,var(--palette-primary)_16%,transparent)]">
                876
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg leading-6 font-medium tracking-[-0.02em] text-[#202124] dark:text-white">
                  Account
                </span>
                <span className="block truncate text-[0.6875rem] leading-4 font-normal text-[#5f6368] dark:text-white/60">
                  Manage your account
                </span>
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3 pt-6 pb-4">
            <AccountSidebarNav enabledFeatureSlugs={enabledFeatureSlugs} />
          </SidebarContent>

          <SidebarUserMenu user={user} onSignOut={handleSignOut} />
        </Sidebar>
      </div>

      <SidebarInset className="bg-876-canvas min-h-dvh">
        <header className="border-876-surface-border bg-876-surface/70 sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="md:hidden">
            <MobileNavDropdown groups={mobileGroups} isActive={isActivePath} />
          </div>
          <SidebarTrigger className="hidden md:flex" />
        </header>

        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

function AccountSidebarNav({
  enabledFeatureSlugs,
}: {
  enabledFeatureSlugs: string[]
}) {
  const pathname = usePathname()
  const enabledSet = new Set(enabledFeatureSlugs)
  const navItems = accountNavItems.filter(
    (item) => !item.featureSlug || enabledSet.has(item.featureSlug)
  )

  return (
    <nav aria-label="Account sections" className="space-y-1">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group focus-visible:ring-sidebar-ring flex min-h-[2.625rem] items-center gap-3.5 rounded-full px-3.5 py-2 text-[0.875rem] leading-5 font-normal text-[#3c4043] transition-colors hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:outline-hidden dark:text-white/75 dark:hover:bg-white/8',
              active &&
                'bg-876-accent-surface text-876-accent-fg hover:bg-876-accent-surface-hover font-medium'
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-[1.25rem] shrink-0 transition-colors"
              style={{ color: item.color }}
            />
            <span className="truncate">{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app'

  return pathname === href || pathname.startsWith(`${href}/`)
}
