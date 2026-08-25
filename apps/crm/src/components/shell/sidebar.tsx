'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@876/ui/sidebar'

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/requests', label: 'Requests' },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname()

  return (
    <SidebarRoot collapsible="icon" className="border-sidebar-border/50 bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link href="/" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <span className="border-sidebar-border flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold">876</span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[0.9375rem] leading-6 font-semibold">{orgName}</span>
            <span className="text-muted-foreground block truncate text-xs">CRM</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-4 pb-4">
        <SidebarGroup className="gap-1.5 p-0">
          <nav aria-label="CRM sections" className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} className={`rounded-md px-3 py-2 text-sm transition-colors group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:text-center ${active ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/70'}`}>
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  <span aria-hidden className="hidden group-data-[collapsible=icon]:inline">•</span>
                </Link>
              )
            })}
          </nav>
        </SidebarGroup>
      </SidebarContent>
    </SidebarRoot>
  )
}
