import { ChevronLeft } from '@876/ui/icons'
import Link from 'next/link'

/**
 * The back link a page one level below a section landing page carries, above
 * its heading (`.claude/rules/app-layout.md` §7). It stays on small viewports —
 * removing it to save vertical space was tried once in Console and reverted.
 */
export function PageBreadcrumb({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm ${className ?? ''}`}
    >
      <ChevronLeft className="size-4" aria-hidden />
      {label}
    </Link>
  )
}
