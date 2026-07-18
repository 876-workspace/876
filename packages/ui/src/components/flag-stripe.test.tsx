import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FlagStripe, getFlagColors } from './flag-stripe'

describe('FlagStripe', () => {
  it('normalizes country codes and falls back to Jamaica', () => {
    expect(getFlagColors('tt')).toEqual(['#DA1A35', '#FFFFFF', '#1A1A1A'])
    expect(getFlagColors('unknown')).toEqual(['#009B3A', '#FED100', '#1A1A1A'])
    expect(getFlagColors(null)).toEqual(['#009B3A', '#FED100', '#1A1A1A'])
  })

  it('renders an inaccessible decorative stripe with equal color segments', () => {
    const { container } = render(<FlagStripe countryCode="HT" thickness={8} />)
    const stripe = container.firstElementChild

    expect(stripe?.getAttribute('aria-hidden')).toBe('true')
    expect((stripe as HTMLElement | null)?.style.width).toBe('8px')
    expect(stripe?.children).toHaveLength(2)
  })
})
