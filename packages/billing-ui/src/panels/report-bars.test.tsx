import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { barHeightPercent, ReportBars } from './report-bars'

describe('barHeightPercent', () => {
  it('scales values against the max as a percentage', () => {
    expect(barHeightPercent('5000', '10000')).toBe(50)
  })

  it('returns zero when the max or the value is not positive', () => {
    expect(barHeightPercent('0', '10000')).toBe(0)
    expect(barHeightPercent('5000', '0')).toBe(0)
  })

  it('floors small positive bars so they stay visible', () => {
    expect(barHeightPercent('1', '100000')).toBe(2)
  })
})

describe('ReportBars', () => {
  it('labels every bar with its formatted value', () => {
    render(
      <ReportBars
        ariaLabel="Net sales"
        bars={[
          { key: 'a', label: 'Aug', valueLabel: 'J$10.00', rawValue: '1000' },
          { key: 'b', label: 'Sep', valueLabel: 'J$20.00', rawValue: '2000' },
        ]}
      />
    )
    expect(screen.getByRole('img', { name: 'Net sales' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Aug: J$10.00' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sep: J$20.00' })).toBeInTheDocument()
  })
})
