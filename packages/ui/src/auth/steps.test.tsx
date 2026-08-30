import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SocialButtons } from './steps'

describe('SocialButtons', () => {
  it('uses a stable display order when enabled providers arrive in a different order', () => {
    render(
      <SocialButtons
        providers={['google', 'microsoft', 'apple']}
        onStart={vi.fn()}
      />
    )

    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual([
      'Continue with Google',
      'Continue with Apple',
      'Continue with Microsoft',
    ])
  })
})
