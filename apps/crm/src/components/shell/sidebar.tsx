'use client'

import type { NavGroupDefinition } from '@876/core/access'
import {
  AlertCircle,
  BarChart3,
  Building2,
  ClipboardList,
  DocumentTextIcon,
  RectangleGroup,
  Settings,
  Users,
} from '@876/ui/icons'

import { NavLink } from './nav-link'

const icons = {
  dashboard: BarChart3,
  requests: ClipboardList,
  customers: Users,
  forms: DocumentTextIcon,
  teams: Building2,
  categories: RectangleGroup,
  priorities: AlertCircle,
  settings: Settings,
}

export function Sidebar({ navigation }: { navigation: NavGroupDefinition[] }) {
  return (
    <>
      {/* Mobile Top Navigation (Horizontal, under Navbar) */}
      <div className="border-border/70 bg-background/90 dark:bg-sidebar/90 flex w-full shrink-0 items-center justify-around border-b px-3 py-2 backdrop-blur-md sm:hidden">
        <nav
          aria-label="CRM mobile sections"
          className="flex items-center gap-2"
        >
          {navigation
            .flatMap((group) => group.entries)
            .map((item) => (
              <NavLink
                key={item.title}
                href={item.href}
                title={item.title}
                icon={icons[item.icon as keyof typeof icons] ?? Settings}
                colorClassName={item.colorClassName}
                side="bottom"
              />
            ))}
        </nav>
      </div>

      {/* Desktop Floating Sidebar (under Navbar) */}
      <aside
        aria-label="CRM sections"
        className="hidden shrink-0 flex-col items-center py-4 pl-[var(--876-shell-gutter)] sm:flex"
      >
        <div className="border-border/80 bg-background/90 dark:bg-sidebar/90 flex flex-col items-center gap-1.5 rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl dark:shadow-black/25 dark:ring-white/[0.06]">
          {navigation.map((group, groupIndex) => (
            <div
              key={group.entries[0]?.key ?? groupIndex}
              className="flex flex-col items-center gap-1.5"
            >
              {groupIndex > 0 && (
                <div className="bg-border/60 my-0.5 h-px w-5" />
              )}
              {group.entries.map((item) => (
                <NavLink
                  key={item.title}
                  href={item.href}
                  title={item.title}
                  icon={icons[item.icon as keyof typeof icons] ?? Settings}
                  colorClassName={item.colorClassName}
                  side="right"
                />
              ))}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
