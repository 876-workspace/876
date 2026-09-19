/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MobileFact, MobileFactList, avatarTone } from './mobile-list'

const AVATAR_TONES = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
]

describe('MobileFactList', () => {
  it('renders a fact label and value', () => {
    render(<MobileFact label="Members" value="3" />)

    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders an em dash for a null value', () => {
    render(<MobileFact label="Customer" value={null} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders an em dash for an empty-string value', () => {
    render(<MobileFact label="Project lead" value="" />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('uses the phone-only class for the fact list', () => {
    render(
      <MobileFactList>
        <MobileFact label="Members" value="3" />
      </MobileFactList>
    )

    expect(screen.getByTestId('mobile-fact-list')).toHaveClass('sm:hidden')
  })

  it('renders each fact as a separate list row', () => {
    render(
      <MobileFactList>
        <MobileFact label="Members" value="3" />
        <MobileFact label="Customer" value={null} />
      </MobileFactList>
    )

    expect(screen.getByTestId('mobile-fact-list').children).toHaveLength(2)
    expect(screen.getByText('Customer').closest('li')).toHaveClass('border-t')
  })
})

describe('avatarTone', () => {
  it('returns the same class for the same seed twice', () => {
    const first = avatarTone('ALP')
    const second = avatarTone('ALP')

    expect(first).toBe(second)
    expect(first).toBe('bg-indigo-500')
  })

  it('returns a class from the avatar palette', () => {
    expect(AVATAR_TONES).toContain(avatarTone('proj_alpha'))
  })
})
