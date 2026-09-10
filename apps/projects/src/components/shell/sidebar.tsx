'use client'

import type { NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import {
  FloatingNavRail,
  FloatingNavRailToggle,
} from '@876/ui/floating-nav-rail'
import { useSyncExternalStore } from 'react'

import { resolveNavIcon } from './nav-icons'
import { NavLink } from './nav-link'
import {
  readServerSidebarExpanded,
  readSidebarExpanded,
  subscribeSidebarExpanded,
  writeSidebarExpanded,
} from './sidebar-preferences'

export function Sidebar({ navigation }: { navigation: NavGroupDefinition[] }) {
  const expanded = useSyncExternalStore(
    subscribeSidebarExpanded,
    readSidebarExpanded,
    readServerSidebarExpanded
  )

  return (
    <FloatingNavRail expanded={expanded} aria-label="Projects navigation">
      <FloatingNavRailToggle
        expanded={expanded}
        onExpandedChange={writeSidebarExpanded}
      />
      <div className="bg-border/60 my-0.5 h-px w-full" />
      {navigation.map((group, groupIndex) => (
        <div
          key={group.entries[0]?.key ?? groupIndex}
          className={cn(
            'flex flex-col gap-1.5',
            expanded ? 'min-w-0' : 'items-center'
          )}
        >
          {groupIndex > 0 ? (
            <div
              className={cn(
                'bg-border/60 my-0.5 h-px',
                expanded ? 'w-full' : 'w-5'
              )}
            />
          ) : null}
          {group.entries.map((item) => (
            <NavLink
              key={item.title}
              href={item.href}
              title={item.title}
              icon={resolveNavIcon(item.icon)}
              colorClassName={item.colorClassName}
              expanded={expanded}
              side="right"
            />
          ))}
        </div>
      ))}
    </FloatingNavRail>
  )
}
