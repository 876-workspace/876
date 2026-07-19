'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/portal', label: 'Dashboard' },
  { href: '/portal/packages', label: 'Packages' },
]

export function PortalNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Portal navigation" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active =
          link.href === '/portal'
            ? pathname === link.href
            : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className="text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground rounded-md px-2.5 py-2 text-sm font-medium transition-colors"
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
