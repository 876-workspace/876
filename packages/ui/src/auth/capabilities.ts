/**
 * Derives the capability matrix and default copy from an {@link AuthMode}.
 *
 * @module @876/ui/auth/capabilities
 */

import type { AuthCapabilities, AuthLabels, AuthMode } from './types'

/**
 * Maps a product mode to the set of flows it exposes. Keeping this pure makes
 * the step components declarative — they read capabilities instead of switching
 * on the raw mode.
 */
export function resolveCapabilities(mode: AuthMode): AuthCapabilities {
  switch (mode) {
    case 'consumer':
      return {
        allowSignUp: true,
        allowRecover: true,
        collectsOrg: false,
        allowMagicOtp: true,
        defaultIntent: 'sign-in',
      }
    case 'enterprise':
      // Enterprise membership is invite-only; no self-service sign up here.
      return {
        allowSignUp: false,
        allowRecover: true,
        collectsOrg: false,
        allowMagicOtp: false,
        defaultIntent: 'sign-in',
      }
    case 'business-onboarding':
      // New business registration: always a sign-up that also creates an org.
      return {
        allowSignUp: true,
        allowRecover: false,
        collectsOrg: true,
        allowMagicOtp: false,
        defaultIntent: 'sign-up',
      }
  }
}

const SHARED_DEFAULT_LABELS: AuthLabels = {
  signInTitle: 'Sign in',
  signInDescription: 'Use your 876 account to continue.',
  signUpTitle: 'Create your account',
  signUpDescription: 'Get started in just a few steps.',
  onboardingTitle: 'Set up your organization',
  onboardingDescription: 'Create a workspace for your business.',
}

/**
 * Returns mode-aware default copy merged with any caller overrides.
 */
export function resolveLabels(
  mode: AuthMode,
  overrides?: Partial<AuthLabels>
): AuthLabels {
  const base: AuthLabels = { ...SHARED_DEFAULT_LABELS }

  if (mode === 'enterprise') {
    base.signInDescription = 'Use your work account to continue.'
  }

  return { ...base, ...overrides }
}
