'use client'

import { useEffect, useState } from 'react'
import {
  BuildingOffice2Icon,
  DocumentTextIcon,
  GlobeAltIcon,
  Phone,
} from '@876/ui/icons'

import type { SectionIcon, SectionSpec } from './field-spec'

const ICONS = {
  organization: BuildingOffice2Icon,
  contact: Phone,
  legal: DocumentTextIcon,
  locale: GlobeAltIcon,
} satisfies Record<SectionIcon, unknown>

/**
 * The profile's own sidebar: a full-height column beside the app sidebar
 * that stays put while the form scrolls, tracking the section in view.
 */
export function SectionNav({ sections }: { sections: SectionSpec[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '')
  const sectionIds = sections.map((section) => section.id).join(',')

  useEffect(() => {
    const targets = sectionIds
      .split(',')
      .map((id) => document.getElementById(`section-${id}`))
      .filter((element): element is HTMLElement => element !== null)

    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [topmost] = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (topmost) setActive(topmost.target.id.replace('section-', ''))
      },
      { rootMargin: '-72px 0px -55% 0px' }
    )

    targets.forEach((target) => observer.observe(target))

    return () => observer.disconnect()
  }, [sectionIds])

  return (
    <nav
      aria-label="Profile sections"
      className="bg-sidebar border-876-surface-border sticky top-0 hidden h-[calc(100svh-3.5rem)] w-60 shrink-0 self-start overflow-y-auto border-r lg:block"
    >
      <p className="876-eyebrow border-876-surface-border border-b px-5 py-4">
        On this page
      </p>

      <ul className="flex flex-col gap-0.5 p-3">
        {sections.map((section) => {
          const Icon = ICONS[section.icon]
          const isActive = section.id === active

          return (
            <li key={section.id}>
              <a
                href={`#section-${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.8125rem] transition-colors ${
                  isActive
                    ? 'bg-(--876-nav-active-bg) font-semibold text-(--876-nav-active-fg)'
                    : 'text-foreground/75 hover:text-foreground hover:bg-muted font-medium'
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-(--876-nav-active-fg)'
                      : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                {section.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
