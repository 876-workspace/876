'use client'

/**
 * The top-level embeddable auth component. Renders the right sequence of steps
 * for the configured {@link AuthMode} and animates between them.
 *
 * @module @876/ui/auth/auth-flow
 */

import type { ReactNode } from 'react'
import { useAuthUI } from './context'
import { AuthHeader, StepShell } from './components'
import {
  BusinessSignUpStep,
  EmailStep,
  OtpStep,
  PasswordStep,
  ProfileStep,
  RecoverStep,
} from './steps'
import { useAuthFlow } from './use-auth-flow'
import type { AuthStep } from './types'

/**
 * Embeddable auth flow. Drop it inside an {@link AuthProvider}.
 *
 * @example
 * ```tsx
 * <AuthProvider config={{ mode: 'consumer', client, onSuccess }}>
 *   <AuthFlow />
 * </AuthProvider>
 * ```
 */
export function AuthFlow() {
  const { labels, capabilities, config } = useAuthUI()
  const flow = useAuthFlow()

  const { step } = flow.state
  const header = resolveHeader(step, labels, config.mode, config.appName)

  return (
    <div className="max-sm:flex max-sm:flex-1 max-sm:flex-col">
      <AuthHeader
        appLogo={config.appLogo}
        title={header.title}
        subtitle={header.subtitle}
        description={header.description}
      />

      <div className="mt-5 max-sm:flex max-sm:flex-1 max-sm:flex-col">
        <StepShell active={step} name="org">
          <BusinessSignUpStep flow={flow} />
        </StepShell>

        <StepShell active={step} name="email">
          <EmailStep flow={flow} />
        </StepShell>

        <StepShell active={step} name="password">
          <PasswordStep flow={flow} />
        </StepShell>

        <StepShell active={step} name="otp">
          <OtpStep flow={flow} kind="magic" />
        </StepShell>

        <StepShell active={step} name="verify-email">
          <OtpStep flow={flow} kind="verify" />
        </StepShell>

        <StepShell active={step} name="profile">
          <ProfileStep flow={flow} />
        </StepShell>

        {capabilities.allowRecover ? (
          <StepShell active={step} name="recover">
            <RecoverStep flow={flow} />
          </StepShell>
        ) : null}
      </div>
    </div>
  )
}

/** The emphasized name of the app the user is accessing. */
function AppNameMark({ appName }: { appName: string }) {
  return (
    <span className="font-semibold text-[var(--palette-primary-deep)]">
      {appName}
    </span>
  )
}

/**
 * The "with your 876 account" service line rendered under the sign-in title,
 * so the entry point names both the destination app and the 876 identity.
 */
function ServiceSubtitle() {
  return (
    <>
      with your <span className="font-semibold">876</span> account
    </>
  )
}

/** Compact destination line for sign-up/onboarding: "on {app}". */
function DestinationSubtitle({ appName }: { appName: string }) {
  return (
    <>
      on <AppNameMark appName={appName} />
    </>
  )
}

function resolveHeader(
  step: AuthStep,
  labels: ReturnType<typeof useAuthUI>['labels'],
  mode: ReturnType<typeof useAuthUI>['config']['mode'],
  appName: string | undefined
): { title: ReactNode; subtitle?: ReactNode; description?: string } {
  // Sign-in names the destination in the title ("Sign in to {app}") and the
  // identity service in the subtitle ("with your 876 account").
  const signInTitle = appName ? (
    <>
      {labels.signInTitle} to <AppNameMark appName={appName} />
    </>
  ) : (
    labels.signInTitle
  )
  const serviceLine = <ServiceSubtitle />

  if (mode === 'business-onboarding') {
    if (step === 'org') {
      return {
        title: labels.onboardingTitle,
        subtitle: appName ? (
          <DestinationSubtitle appName={appName} />
        ) : undefined,
        description: appName ? undefined : labels.onboardingDescription,
      }
    }
    if (step === 'verify-email') return { title: 'Verify your email' }
  }

  switch (step) {
    case 'password':
    case 'otp':
    case 'verify-email':
      return { title: signInTitle, subtitle: appName ? serviceLine : undefined }
    case 'profile':
      return {
        title: labels.signUpTitle,
        subtitle: appName ? (
          <DestinationSubtitle appName={appName} />
        ) : undefined,
        description: labels.signUpDescription,
      }
    case 'recover':
      return {
        title: 'Reset your password',
        description: 'We will email you a link to set a new password.',
      }
    default:
      return {
        title: signInTitle,
        subtitle: appName ? serviceLine : undefined,
        // The service line carries the context; fall back to descriptive copy
        // only when no app name is configured.
        description: appName ? undefined : labels.signInDescription,
      }
  }
}
