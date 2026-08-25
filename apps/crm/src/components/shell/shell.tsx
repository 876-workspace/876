import type { ReactNode } from 'react'

import { NavProgress } from '@876/ui/nav-progress'
import { SidebarTrigger } from '@876/ui/sidebar'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebarArea,
} from '@876/ui/app-shell'

import { Sidebar } from './sidebar'

export function Shell({
  children,
  orgName,
}: {
  children: ReactNode
  orgName: string
}) {
  return (
    <AppShell defaultOpen>
      <NavProgress />
      <AppShellSidebarArea>
        <Sidebar orgName={orgName} />
      </AppShellSidebarArea>
      <AppShellContent>
        <AppShellHeader className="border-b-0">
          <SidebarTrigger />
          <div className="ml-auto text-sm font-medium">876 CRM</div>
        </AppShellHeader>
        <AppShellBody>
          <AppShellMain>{children}</AppShellMain>
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
