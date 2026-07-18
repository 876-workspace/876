import { cookies } from 'next/headers'

import { requirePagePermission } from '@/lib/auth/billing-context'
import type { Permission } from '@/types/access'
import { SettingsSidebarLayout } from './settings-sidebar-layout'

const COMPLIANCE_SECTIONS = [
  {
    label: 'Currencies',
    href: '/settings/compliance/currencies',
    icon: 'circle-stack',
    permission: 'currencies:read',
  },
  {
    label: 'Taxes',
    href: '/settings/compliance/tax-rates',
    icon: 'hash',
    permission: 'taxes:read',
  },
  {
    label: 'Tax authorities',
    href: '/settings/compliance/tax-authorities',
    icon: 'globe',
    permission: 'taxes:read',
  },
] satisfies Array<{
  label: string
  href: string
  icon: string
  permission: Permission
}>

export default async function ComplianceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await requirePagePermission('settings:read')

  const cookieStore = await cookies()
  const collapsed = cookieStore.get('settings_nav_collapsed')?.value === 'true'

  const items = COMPLIANCE_SECTIONS.filter((section) =>
    context.permissions.includes(section.permission)
  ).map((section) => ({
    label: section.label,
    href: section.href,
    icon: section.icon,
  }))

  return (
    <div className="px-4 pt-8 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <SettingsSidebarLayout items={items} defaultCollapsed={collapsed}>
          {children}
        </SettingsSidebarLayout>
      </div>
    </div>
  )
}
