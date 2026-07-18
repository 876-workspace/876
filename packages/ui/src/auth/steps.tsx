'use client'

/**
 * The individual screens of the progressive auth flow. Each reads the shared
 * {@link AuthFlowController} and manages only its own input state.
 *
 * @module @876/ui/auth/steps
 */

import { useEffect, useState, useCallback, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  UserPlus,
} from '../icons'

import type { SDK876AuthClient } from './types'

import { useAuthUI } from './context'
import {
  AuthActionRow,
  AuthFooterLink,
  Field,
  IdentityRow,
  Notice,
  OtpField,
  PasswordField,
  StepForm,
  SubmitButton,
} from './components'
import type { AuthFlowController } from './use-auth-flow'
import type { SocialProvider } from './types'
import { PROVIDER_ICONS } from './provider-icons'
import { useSocialProviders } from './use-social-providers'

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  microsoft: 'Microsoft',
  github: 'GitHub',
  gitlab: 'GitLab',
  linkedin: 'LinkedIn',
  slack: 'Slack',
}

function formatResolvedIdentifier(identifier: string): string {
  const trimmed = identifier.trim()
  if (!trimmed || trimmed.includes('@')) return trimmed

  return `@${trimmed}`
}

/** Email / username entry — the universal first step. */
export function EmailStep({ flow }: { flow: AuthFlowController }) {
  const { config } = useAuthUI()
  const { identifier } = flow.state
  const busy =
    flow.state.status === 'resolving' || flow.state.status === 'submitting'
  const providers = useSocialProviders(config.client, config.socialProviders)

  return (
    <div className="max-sm:flex max-sm:flex-1 max-sm:flex-col max-sm:gap-6 sm:space-y-4">
      <StepForm onSubmit={() => void flow.actions.submitEmail(identifier)}>
        <div className="w-full space-y-5 sm:space-y-4">
          <Field
            id="auth-identifier"
            label="Enter username or email"
            icon={<Mail aria-hidden="true" className="h-[1em]" />}
            type="text"
            autoComplete="username"
            autoFocus
            required
            value={identifier}
            onChange={(event) => flow.actions.setIdentifier(event.target.value)}
          />

          <AuthActionRow
            primary={
              <SubmitButton
                busy={flow.state.status === 'resolving'}
                className="min-w-24 !rounded-full px-6"
                variant="neutral"
              >
                Next
              </SubmitButton>
            }
          />
        </div>

        <Notice notice={flow.state.notice} />
      </StepForm>

      <div className="space-y-3 max-sm:mt-auto max-sm:space-y-4 max-sm:pt-6">
        {providers.length > 0 ? (
          <SocialButtons
            busy={busy}
            providers={providers}
            onStart={(provider) => void flow.actions.startSocial(provider)}
          />
        ) : null}

        <div className="text-sm text-[var(--auth-muted)] max-sm:flex max-sm:justify-center">
          <button
            type="button"
            disabled={busy || !identifier.trim()}
            onClick={() => void flow.actions.sendMagicOtp(identifier)}
            className="auth-link auth-link-primary inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Sign in with a one-time code instead
          </button>
        </div>
      </div>
    </div>
  )
}

/** Password entry for an existing account. */
export function PasswordStep({ flow }: { flow: AuthFlowController }) {
  const { capabilities } = useAuthUI()
  const [password, setPassword] = useState('')
  const resolution = flow.state.resolution
  const busy = flow.state.status === 'submitting'
  const showOtpOption =
    capabilities.allowMagicOtp || (resolution?.methods.includes('otp') ?? false)

  return (
    <StepForm onSubmit={() => void flow.actions.submitPassword(password)}>
      <IdentityRow
        identity={formatResolvedIdentifier(flow.state.identifier)}
        onBack={flow.actions.backToEmail}
      />

      <div className="w-full space-y-4">
        <PasswordField
          id="auth-password"
          name="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setPassword(event.target.value)
          }
          onBlur={() => {}}
        />

        <AuthActionRow
          secondary={
            capabilities.allowRecover ? (
              <button
                type="button"
                onClick={() => flow.actions.goTo('recover')}
                className="auth-link auth-link-primary text-sm"
              >
                Forgot password?
              </button>
            ) : undefined
          }
          primary={
            <SubmitButton
              busy={busy}
              className="min-w-24 !rounded-full px-6"
              variant="neutral"
            >
              Login
            </SubmitButton>
          }
        />

        {showOtpOption ? (
          <div>
            <div className="relative flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--auth-card-border)]" />
              <span className="text-[0.6875rem] font-semibold tracking-widest text-[var(--auth-muted)] uppercase">
                or
              </span>
              <div className="h-px flex-1 bg-[var(--auth-card-border)]" />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--auth-card-border)] bg-[color-mix(in_oklab,var(--auth-card-surface)_88%,var(--color-primary)_6%)] p-3.5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-base-content)]">
                    Prefer a one-time code?
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--auth-muted)]">
                    We will send a sign-in code to this email.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void flow.actions.sendMagicOtp(flow.state.identifier)
                    }
                    className="auth-link auth-link-primary mt-2 inline-flex text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send me a code instead
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Notice notice={flow.state.notice} />
    </StepForm>
  )
}

/**
 * OTP entry step. `kind="magic"` is for passwordless sign-in via magic OTP;
 * `kind="verify"` is for completing an email-verification challenge after
 * registration or login.
 */
export function OtpStep({
  flow,
  kind,
}: {
  flow: AuthFlowController
  kind: 'magic' | 'verify'
}) {
  const [code, setCode] = useState('')
  // Current epoch second held in state so the render stays pure. The effect
  // bumps it once the resend cooldown elapses, re-enabling the disabled button
  // without waiting on an unrelated state change.
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const busy = flow.state.status === 'submitting'
  const resendAt =
    kind === 'magic'
      ? (flow.state.canResendAt ?? 0)
      : (flow.state.canResendAt ?? 0) + 30
  const canResend =
    kind === 'magic' && flow.state.canResendAt === null ? true : now >= resendAt

  useEffect(() => {
    if (canResend) return
    const remainingMs = (resendAt - now) * 1000
    const timer = setTimeout(
      () => setNow(Math.floor(Date.now() / 1000)),
      Math.max(remainingMs, 250)
    )
    return () => clearTimeout(timer)
  }, [canResend, resendAt, now])

  const handleSubmit = () => {
    if (kind === 'magic') {
      void flow.actions.submitMagicOtp(code)
    } else {
      void flow.actions.submitVerifyCode(code)
    }
  }

  const handleResend = useCallback(() => {
    if (kind === 'magic') {
      void flow.actions.sendMagicOtp(flow.state.identifier || flow.state.email)
    } else {
      void flow.actions.submitEmail(flow.state.identifier)
    }
  }, [flow, kind])

  return (
    <StepForm onSubmit={handleSubmit}>
      <div className="space-y-2">
        <IdentityRow
          identity={flow.state.email || flow.state.identifier}
          onBack={flow.actions.backToEmail}
        />
        <p className="text-sm leading-6 text-[var(--auth-muted)]">
          We sent a 6-digit code to your email. Enter it below to continue.
        </p>
      </div>

      <OtpField
        id="auth-otp"
        name="code"
        value={code}
        autoFocus
        onBlur={() => {}}
        onChange={(nextValue: string) => setCode(nextValue)}
      />

      <SubmitButton busy={busy}>
        {busy ? (
          'Verifying...'
        ) : (
          <>
            <KeyRound aria-hidden="true" className="h-4 w-4" />
            Verify code
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </>
        )}
      </SubmitButton>

      <div className="flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          disabled={!canResend}
          onClick={handleResend}
          className="auth-link auth-link-primary inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw aria-hidden="true" className="h-3 w-3" />
          Resend code
        </button>

        <button
          type="button"
          onClick={flow.actions.backToEmail}
          className="auth-link inline-flex items-center gap-1"
        >
          <ArrowLeft aria-hidden="true" className="h-3 w-3" />
          Back
        </button>
      </div>

      <Notice notice={flow.state.notice} />
    </StepForm>
  )
}

/** Profile collection for a new account. */
export function ProfileStep({ flow }: { flow: AuthFlowController }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const busy = flow.state.status === 'submitting'

  return (
    <StepForm
      onSubmit={() =>
        void flow.actions.submitProfile({
          email: flow.state.email,
          password,
          firstName,
          lastName,
        })
      }
    >
      <IdentityRow
        identity={flow.state.email}
        onBack={flow.actions.backToEmail}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="auth-first-name"
          label="First name"
          autoComplete="given-name"
          autoFocus
          required
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <Field
          id="auth-last-name"
          label="Last name"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>

      <PasswordField
        id="auth-new-password"
        name="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setPassword(event.target.value)
        }
        onBlur={() => {}}
      />

      <SubmitButton busy={busy}>
        {busy ? (
          'Creating account...'
        ) : (
          <>
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Create account
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </>
        )}
      </SubmitButton>

      <Notice notice={flow.state.notice} />
    </StepForm>
  )
}

/** Owner profile and organization details for business sign-up. */
export function BusinessSignUpStep({ flow }: { flow: AuthFlowController }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const busy = flow.state.status === 'submitting'

  return (
    <StepForm
      onSubmit={() =>
        void flow.actions.submitBusinessProfile({
          email,
          password,
          firstName,
          lastName,
          organizationName,
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="auth-business-first-name"
          label="First name"
          autoComplete="given-name"
          autoFocus
          required
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <Field
          id="auth-business-last-name"
          label="Last name"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>

      <Field
        id="auth-business-organization-name"
        label="Organization name"
        autoComplete="organization"
        required
        value={organizationName}
        onChange={(event) => setOrganizationName(event.target.value)}
      />

      <Field
        id="auth-business-email"
        label="Email"
        icon={<Mail aria-hidden="true" className="h-[1em]" />}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <PasswordField
        id="auth-business-password"
        name="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setPassword(event.target.value)
        }
        onBlur={() => {}}
      />

      <SubmitButton busy={busy}>
        {busy ? (
          'Creating workspace...'
        ) : (
          <>
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Create workspace
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </>
        )}
      </SubmitButton>

      <Notice notice={flow.state.notice} />
    </StepForm>
  )
}

/** Password recovery request. */
export function RecoverStep({ flow }: { flow: AuthFlowController }) {
  const [email, setEmail] = useState(flow.state.email)
  const busy = flow.state.status === 'submitting'

  return (
    <div className="space-y-6">
      <StepForm onSubmit={() => void flow.actions.recover(email)}>
        <Field
          id="auth-recover-email"
          label="Email"
          icon={<Mail aria-hidden="true" className="h-[1em]" />}
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <SubmitButton busy={busy}>
          {busy ? (
            'Sending...'
          ) : (
            <>
              Send reset link
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </>
          )}
        </SubmitButton>
        <Notice notice={flow.state.notice} />
      </StepForm>

      <AuthFooterLink>
        <button
          type="button"
          onClick={flow.actions.backToEmail}
          className="auth-link auth-link-primary"
        >
          Back to login
        </button>
      </AuthFooterLink>
    </div>
  )
}

/**
 * Standalone password-reset form. Designed for a dedicated `/reset-password`
 * page where the reset `token` arrives as a URL query param. Works without
 * `AuthProvider` — pass the auth client and token directly.
 */
export function ResetPasswordStep({
  client,
  token,
  onSuccess,
}: {
  client: SDK876AuthClient
  token: string
  onSuccess?: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    const result = await client.resetPassword({ token, password })
    setBusy(false)
    if (result.error) {
      setError(
        result.error.message ?? 'Something went wrong. Please try again.'
      )
      return
    }
    setDone(true)
    onSuccess?.()
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]">
          <CheckCircle aria-hidden="true" className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-[var(--color-base-content)]">
          Password updated
        </p>
        <p className="text-sm text-[var(--auth-muted)]">
          Your password has been changed. You can now log in.
        </p>
      </div>
    )
  }

  return (
    <StepForm onSubmit={() => void handleSubmit()}>
      <PasswordField
        id="auth-new-password"
        name="password"
        autoComplete="new-password"
        autoFocus
        required
        label="New password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setPassword(e.target.value)
        }
        onBlur={() => {}}
      />

      <div className="mt-4">
        <PasswordField
          id="auth-confirm-password"
          name="confirm"
          autoComplete="new-password"
          required
          label="Confirm new password"
          value={confirm}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setConfirm(e.target.value)
          }
          onBlur={() => {}}
        />
      </div>

      {error ? (
        <p className="mt-2 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <SubmitButton busy={busy}>
          {busy ? (
            'Updating...'
          ) : (
            <>
              <Lock aria-hidden="true" className="h-4 w-4" />
              Set new password
            </>
          )}
        </SubmitButton>
      </div>
    </StepForm>
  )
}

/** Row of social provider buttons. */
export function SocialButtons({
  busy,
  providers,
  onStart,
}: {
  busy?: boolean
  providers: SocialProvider[]
  onStart: (provider: SocialProvider) => void
}) {
  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--auth-card-border)]" />
        <span className="text-xs tracking-widest text-[var(--auth-muted)] uppercase">
          or
        </span>
        <div className="h-px flex-1 bg-[var(--auth-card-border)]" />
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center">
        {providers.map((provider) => {
          const Icon = PROVIDER_ICONS[provider]
          const label = PROVIDER_LABELS[provider] ?? provider
          const buttonClassName =
            'auth-btn auth-btn-outline flex h-12 min-h-12 w-full min-w-0 items-center justify-center gap-3 !rounded-xl !px-4 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-h-10 sm:w-auto sm:max-w-24 sm:flex-1 sm:!rounded-lg sm:!px-3'

          return (
            <button
              key={provider}
              type="button"
              disabled={busy}
              aria-label={`Continue with ${label}`}
              onClick={() => onStart(provider)}
              className={buttonClassName}
            >
              {Icon ? <Icon aria-hidden="true" className="h-5 w-5" /> : null}
              <span className="text-sm sm:hidden">Continue with {label}</span>
              {!Icon ? (
                <span className="hidden text-xs sm:inline">{label}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
