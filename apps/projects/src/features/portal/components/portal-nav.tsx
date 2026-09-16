'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECTIONS = [
  { key: 'overview', label: 'Overview', suffix: '' },
  { key: 'phases', label: 'Phases', suffix: '/phases' },
  { key: 'work', label: 'Work', suffix: '/work' },
  { key: 'files', label: 'Files', suffix: '/files' },
  { key: 'discussions', label: 'Discussions', suffix: '/discussions' },
  { key: 'time', label: 'Time', suffix: '/time' },
  { key: 'invoices', label: 'Invoices', suffix: '/invoices' },
] as const

/**
 * Portal section navigation. Plain links only: portal pages are
 * server-rendered through the portal client, with no app shell.
 */
export function PortalNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/portal/${encodeURIComponent(projectId)}`
  return (
    <nav aria-label="Client portal" className="flex flex-wrap gap-1">
      {SECTIONS.map((section) => {
        const href = `${base}${section.suffix}`
        const active =
          section.suffix === ''
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={section.key}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 text-sm hover:underline ${active ? 'font-semibold' : ''}`}
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
