import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TimePeriodNav } from './time-period-nav'
import { defaultTimePeriod } from './time-period'

const WEEK = defaultTimePeriod(1704283200)
const CURRENT_WEEK = { from: 1705276800, to: 1705881599 }

describe('TimePeriodNav', () => {
  it('steps the period and shows the range it covers', () => {
    render(<TimePeriodNav period={WEEK} current={WEEK} />)

    expect(screen.getByText('Jan 1 – Jan 7')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      `/time?from=${WEEK.from - 604800}&to=${WEEK.to - 604800}`
    )
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      `/time?from=${WEEK.from + 604800}&to=${WEEK.to + 604800}`
    )
  })

  it('offers a way back to the current week only when away from it', () => {
    const { rerender } = render(
      <TimePeriodNav period={WEEK} current={CURRENT_WEEK} />
    )

    expect(screen.getByRole('link', { name: 'This week' })).toHaveAttribute(
      'href',
      `/time?from=${CURRENT_WEEK.from}&to=${CURRENT_WEEK.to}`
    )

    rerender(<TimePeriodNav period={WEEK} current={WEEK} />)

    expect(screen.queryByRole('link', { name: 'This week' })).toBeNull()
  })
})
