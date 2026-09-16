import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'

import { timePeriodHref } from './time-links'
import { formatTimePeriod, shiftTimePeriod, type TimePeriod } from './time-period'

/** Weekly stepping over the period the entries below are read for. */
export function TimePeriodNav({
  period,
  current,
}: {
  period: TimePeriod
  current: TimePeriod
}) {
  const onCurrentPeriod =
    period.from === current.from && period.to === current.to

  return (
    <nav aria-label="Time period" className="mb-5 flex flex-wrap items-center gap-3">
      <Link
        href={timePeriodHref(shiftTimePeriod(period, -1))}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Previous
      </Link>
      <span className="text-sm font-medium" data-period-range>
        {formatTimePeriod(period)}
      </span>
      <Link
        href={timePeriodHref(shiftTimePeriod(period, 1))}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Next
      </Link>
      {onCurrentPeriod ? null : (
        <Link href={timePeriodHref(current)} className="text-sm hover:underline">
          This week
        </Link>
      )}
    </nav>
  )
}
