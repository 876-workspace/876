/**
 * Public types for the embeddable 876 auth UI.
 *
 * @module @876/ui/auth/types
 */

import type React from 'react'

import type { SDK876AuthClient, SocialProvider, User } from '@876/sdk'

/**
 * The product context the auth UI renders for. Controls which steps and tabs
 * are available in the flow.
 *
 * - `consumer` — sign in, sign up, and recovery for end users.
 * - `enterprise` — sign in and recovery only; sign up is invite-only.
 * - `business-onboarding` — single-form owner and organization registration.
 */
export type AuthMode = 'consumer' | 'enterprise' | 'business-onboarding'

/**
 * A single screen within the progressive flow. The card animates between these.
 */
export type AuthStep =
  | 'email'
  | 'password'
  | 'otp'
  | 'profile'
  /** Single-form business sign-up (owner profile + organization). */
  | 'org'
  | 'verify-email'
  | 'recover'

/**
 * Which intent the user is pursuing. The email step branches into one of these.
 */
export type AuthIntent = 'sign-in' | 'sign-up' | 'recover'

/**
 * The authentication methods available for a resolved identifier.
 */
export type AuthMethod = 'password' | 'otp' | 'sso'

/**
 * The result of resolving a typed identifier (email or username) against the
 * account platform. Determines the next step after the email screen.
 */
export type IdentifierResolution = {
  /** The canonical email the identifier resolves to. */
  email: string
  /** Whether an account already exists for this identifier. */
  exists: boolean
  /** The sign-in methods available for an existing account. */
  methods: AuthMethod[]
  /** The SSO provider to route to, when `methods` includes `sso`. */
  ssoProvider?: SocialProvider | null
}

/**
 * Lifecycle events emitted by the flow. Consuming apps can wire these to
 * analytics without the package depending on any analytics library.
 */
export type AuthUIEvent =
  | { type: 'email_submitted'; identifier: string }
  | { type: 'step_changed'; step: AuthStep }
  | { type: 'sign_in_succeeded'; user: User }
  | { type: 'sign_up_succeeded'; user: User }
  | {
      type: 'email_verification_required'
      email: string
      pendingAuthenticationToken?: string
    }
  | { type: 'error'; message: string; code?: string }
  | { type: 'abandoned'; step: AuthStep }

/**
 * Customizable copy. Any omitted label falls back to a mode-aware default.
 */
export type AuthLabels = {
  signInTitle: string
  signInDescription: string
  signUpTitle: string
  signUpDescription: string
  onboardingTitle: string
  onboardingDescription: string
}

/**
 * Configuration supplied to {@link AuthProvider}. Everything the flow needs to
 * talk to the account platform and report back to the host app.
 */
export type AuthUIConfig = {
  /** The product context. */
  mode: AuthMode
  /**
   * The auth namespace of a `create876Client()` instance. All API calls route
   * through this, so each app owns its own session and transport.
   */
  client: SDK876AuthClient
  /**
   * Base URL of the account platform that hosts `/api/auth/*`. Used by the
   * default {@link AuthUIConfig.resolveIdentifier} when no override is given.
   */
  baseUrl?: string
  /**
   * Name of the application the user is signing in to access — first-party
   * (e.g. "Console") or a future third-party app. Rendered as the
   * "to access {appName}" line under the sign-in title. The 876 brand mark
   * itself is page chrome owned by the {@link AuthPageShell}.
   */
  appName?: string
  /**
   * Optional logo for the app the user is signing in to access. When provided,
   * the auth header renders a co-brand lockup (`[appLogo] ··· [876 logo]`) on
   * desktop, making it clear the user signs in with 876 to reach a separate
   * app. Used for first-party surfaces (e.g. Console) today and future
   * third-party "Sign in with 876" consent screens.
   */
  appLogo?: React.ReactNode
  /**
   * Optional allow-list filter over the providers discovered from the API
   * (`GET /auth/providers`). When omitted, every enabled provider is shown;
   * when set, only the listed providers are surfaced on the email step.
   */
  socialProviders?: SocialProvider[]
  /**
   * Override the email-resolution behavior. Defaults to a fetch against
   * `${baseUrl}/api/auth/check-email`.
   */
  resolveIdentifier?: (identifier: string) => Promise<IdentifierResolution>
  /** Called once a session is established (sign in or verified sign up). */
  onSuccess?: (result: { user: User }) => void
  /**
   * Called when the platform returns an email-verification challenge after a
   * password login or sign up. Lets the host persist the pending token and
   * redirect to a dedicated `/verify-email` page instead of verifying in-card.
   *
   * Return `true` if the host fully handled it (persisted + navigating away) —
   * the flow then skips its in-card verify step. Return `false`/`undefined`
   * (e.g. browser storage unavailable) to fall back to the built-in in-card
   * verify step, which already holds the pending token.
   */
  onEmailVerificationRequired?: (challenge: {
    email: string
    pendingAuthenticationToken?: string
  }) => boolean
  /** Optional lifecycle hook for analytics. */
  onEvent?: (event: AuthUIEvent) => void
  /** Copy overrides. */
  labels?: Partial<AuthLabels>
  /** Theme accent applied via CSS custom property. */
  accentColor?: string
}

/**
 * Capability matrix derived from {@link AuthMode}. Computed once and exposed via
 * context so step components stay declarative.
 */
export type AuthCapabilities = {
  allowSignUp: boolean
  allowRecover: boolean
  collectsOrg: boolean
  /**
   * Whether the password step offers a passwordless "send me a code instead"
   * affordance even when the resolved identifier did not report `otp` as an
   * available method. Consumer login always offers it.
   */
  allowMagicOtp: boolean
  defaultIntent: AuthIntent
}

export type { SDK876AuthClient, SocialProvider, User }
