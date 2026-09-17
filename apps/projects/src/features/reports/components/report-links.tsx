import Link from 'next/link'

import type { ReportPeriod } from '@/types/reporting'

import { REPORT_LINKS, reportHref, type ReportKey } from '../report-query'

/**
 * Links between the report pages. The page being read renders as text with
 * `aria-current`, so the nav never offers a link to itself.
 */
export function ReportLinks({
  current,
  period,
}: {
  current: ReportKey | null
  period: ReportPeriod
}) {
  return (
    <nav aria-label="Reports" className="flex flex-wrap items-center gap-4">
      {REPORT_LINKS.map((link) =>
        link.key === current ? (
          <span
            key={link.key}
            aria-current="page"
            className="text-sm font-semibold"
          >
            {link.label}
          </span>
        ) : (
          <Link
            key={link.key}
            href={reportHref(link.href, period)}
            className="text-sm font-medium underline underline-offset-4"
          >
            {link.label}
          </Link>
        )
      )}
    </nav>
  )
}
