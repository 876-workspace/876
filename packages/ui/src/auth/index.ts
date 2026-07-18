/**
 * `@876/ui/auth` — Clerk-style embeddable auth UI for the 876 platform.
 *
 * Render an {@link AuthFlow} inside an {@link AuthProvider}, give it a configured
 * `@876/sdk` client and a `mode`, and it handles the entire progressive,
 * email-first authentication experience. Each app keeps ownership of its own
 * session; this package is presentation + flow logic only.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { create876Client } from '@876/sdk'
 * import { AuthProvider, AuthFlow } from '@876/ui/auth'
 *
 * const $876 = create876Client({ baseUrl: '/api' })
 *
 * export function ConsumerAuth() {
 *   return (
 *     <AuthProvider
 *       config={{
 *         mode: 'consumer',
 *         client: $876.auth,
 *         socialProviders: ['google'],
 *         onSuccess: () => { window.location.assign('/app') },
 *       }}
 *     >
 *       <AuthFlow />
 *     </AuthProvider>
 *   )
 * }
 * ```
 *
 * @module @876/ui/auth
 */

export { AuthProvider, useAuthUI } from './context'
export { AuthFlow } from './auth-flow'
export { useAuthFlow } from './use-auth-flow'
export type {
  AuthFlowController,
  FlowNotice,
  FlowStatus,
  FlowState,
} from './use-auth-flow'
export {
  AppLogo,
  AuthAlert,
  AuthFooterLink,
  AuthHeader,
  AuthPageShell,
  Field,
  FieldError,
  IdentityRow,
  Notice,
  OtpField,
  PasswordField,
  StepForm,
  StepShell,
  SubmitButton,
} from './components'
export {
  BusinessSignUpStep,
  EmailStep,
  OtpStep,
  PasswordStep,
  ProfileStep,
  RecoverStep,
  ResetPasswordStep,
  SocialButtons,
} from './steps'
export { resolveCapabilities, resolveLabels } from './capabilities'
export { createDefaultIdentifierResolver } from './resolve-identifier'
export type {
  AuthCapabilities,
  AuthIntent,
  AuthLabels,
  AuthMethod,
  AuthMode,
  AuthStep,
  AuthUIConfig,
  AuthUIEvent,
  IdentifierResolution,
} from './types'
export type { SDK876AuthClient, SocialProvider, User } from './types'
