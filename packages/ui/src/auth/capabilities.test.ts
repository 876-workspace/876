import { describe, expect, it } from 'vitest'

import { resolveCapabilities, resolveLabels } from './capabilities'

describe('resolveCapabilities', () => {
  it.each([
    ['consumer', true, true, false, true, 'sign-in'],
    ['enterprise', false, true, false, false, 'sign-in'],
    ['business-onboarding', true, false, true, false, 'sign-up'],
  ] as const)(
    'returns the correct flow policy for %s',
    (
      mode,
      allowSignUp,
      allowRecover,
      collectsOrg,
      allowMagicOtp,
      defaultIntent
    ) => {
      expect(resolveCapabilities(mode)).toEqual({
        allowSignUp,
        allowRecover,
        collectsOrg,
        allowMagicOtp,
        defaultIntent,
      })
    }
  )
})

describe('resolveLabels', () => {
  it('uses enterprise-specific copy and preserves caller overrides', () => {
    expect(
      resolveLabels('enterprise', { signInTitle: 'Welcome back' })
    ).toMatchObject({
      signInTitle: 'Welcome back',
      signInDescription: 'Use your work account to continue.',
    })
  })
})
