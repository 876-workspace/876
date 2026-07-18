'use client'

/**
 * Shared presentational primitives for the auth UI. Styling relies on the
 * host app's daisyUI theme + auth CSS variables, so the package ships no CSS.
 *
 * @module @876/ui/auth/components
 */

import {
  forwardRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ArrowLeft, Eye, EyeOff, Lock } from '../icons'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

import { Logo } from '../components/logo'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../components/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/input-otp'

import type { FlowNotice } from './use-auth-flow'

interface AuthPageShellProps {
  children: ReactNode
  footerLinks?: AuthFooterLinkItem[]
  /**
   * Hide the top-left 876 wordmark on every breakpoint. Set this when the auth
   * header renders a co-brand lockup (`[876] ··· [app]`) so the 876 mark is not
   * shown twice.
   */
  hideBrandMark?: boolean
  /**
   * Desktop arrangement of the auth surface.
   *
   * - `center` — one compact card centered on the canvas (default).
   * - `split` — the form becomes a full-height panel pinned to the right edge;
   *   the left side of the viewport stays an open brand canvas reserved for
   *   future content. Below `lg` both layouts render identically.
   */
  layout?: 'center' | 'split'
}

type AuthFooterLinkItem = {
  label: string
  href: string
}

const DEFAULT_AUTH_FOOTER_LINKS: AuthFooterLinkItem[] = [
  { label: 'Privacy', href: 'https://876.dev/privacy' },
  { label: 'Terms', href: 'https://876.dev/terms' },
]

/**
 * The shared 876 auth canvas. On `sm` and up: a gray page with one compact,
 * centered white card (Google sign-in style). On mobile the card fills the
 * screen edge-to-edge with content flowing top-down. Every app — internal or
 * third-party — renders its auth flow inside this shell so sign-in looks
 * identical across the platform.
 */
export function AuthPageShell({
  children,
  footerLinks = DEFAULT_AUTH_FOOTER_LINKS,
  hideBrandMark = false,
  layout = 'center',
}: AuthPageShellProps) {
  const split = layout === 'split'

  return (
    <main
      id="auth-page"
      className={[
        'flex min-h-dvh flex-col bg-[var(--auth-card-surface)] text-[var(--color-base-content)] sm:flex-row sm:items-center sm:justify-center sm:bg-[var(--auth-canvas)] sm:px-6 sm:py-8',
        split ? 'lg:items-stretch lg:justify-end lg:px-0 lg:py-0' : 'lg:px-8',
      ].join(' ')}
    >
      {split ? (
        // Open brand canvas reserved for future marketing/product content.
        <div
          aria-hidden="true"
          className="hidden lg:block lg:min-w-0 lg:flex-1"
        />
      ) : null}

      <section
        className={[
          'auth-card flex w-full flex-1 flex-col overflow-hidden bg-[var(--auth-card-surface)] sm:max-w-[26rem] sm:flex-none sm:rounded-[1.75rem] sm:border sm:border-[var(--auth-card-border)] sm:shadow-[var(--auth-shadow)]',
          split
            ? 'lg:w-[30rem] lg:max-w-none lg:rounded-none lg:border-0 lg:border-l lg:border-[var(--auth-card-border)] lg:shadow-[-24px_0_60px_-32px_rgb(0_0_0_/_0.18)] xl:w-[33rem]'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={[
            'flex min-w-0 flex-1 flex-col gap-8 p-6 pt-8 sm:gap-4 sm:p-8 lg:px-10 lg:py-9',
            split
              ? 'lg:mx-auto lg:w-full lg:max-w-[28rem] lg:px-12 lg:py-10 xl:px-14'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div
            className={[
              'text-2xl leading-none max-sm:relative max-sm:top-2 max-sm:mb-4',
              hideBrandMark ? 'hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Logo className="text-[color-mix(in_oklab,var(--color-base-content)_88%,var(--palette-primary))]" />
          </div>

          <div className="flex w-full flex-1 flex-col gap-4 lg:justify-center">
            {children}
          </div>

          <AuthPageFooter links={footerLinks} />
        </div>
      </section>
    </main>
  )
}

function AuthPageFooter({ links }: { links: AuthFooterLinkItem[] }) {
  return (
    <footer className="mt-auto flex flex-col gap-4 pt-8 text-[0.6875rem] font-medium text-[var(--auth-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pt-5">
      <p className="flex items-center gap-2">
        <span>&copy; 876 Platforms</span>
        <span
          aria-hidden="true"
          className="h-1 w-1 rounded-full bg-[color-mix(in_oklab,var(--auth-muted)_55%,transparent)]"
        />
        <span>efesto</span>
      </p>
      {links.length > 0 ? (
        <nav
          aria-label="Auth support links"
          className="flex items-center gap-6"
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} className="auth-footer-link">
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </footer>
  )
}

/**
 * Left-aligned step header for the form pane. The 876 brand mark lives in the
 * {@link AuthPageShell} chrome, so the header is pure copy:
 *
 * - `title` — the headline, e.g. "Sign in".
 * - `subtitle` — the access line, e.g. "to access Console".
 * - `appLogo` — optional third-party logo; renders the dual-logo connector
 *   (`[app logo] ··· [876 logo]`) for future "Sign in with 876" consent.
 */
export function AuthHeader({
  appLogo,
  title,
  subtitle,
  description,
}: {
  /**
   * Logo of the app the user is signing in to access. When present, the header
   * renders a co-brand lockup (`[app] ··· [876]`) on desktop only, so the
   * mobile header is left untouched.
   */
  appLogo?: ReactNode
  title?: ReactNode
  /** Prominent access line rendered directly under the title. */
  subtitle?: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="text-left">
      {appLogo ? (
        // Co-brand lockup ([876] ··· [app]) shown on every breakpoint. The
        // host hides the shell's top-left 876 wordmark (via `hideBrandMark`)
        // so 876 is not shown twice.
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--auth-card-border)] bg-[var(--auth-card-surface)] text-xl shadow-sm">
            <Logo className="text-[color-mix(in_oklab,var(--color-base-content)_88%,var(--palette-primary))]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-[var(--auth-card-border)]" />
            <span className="h-1 w-1 rounded-full bg-[var(--auth-card-border)]" />
            <span className="h-1 w-1 rounded-full bg-[var(--auth-card-border)]" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--auth-card-border)] bg-[var(--auth-card-surface)] shadow-sm">
            {appLogo}
          </div>
        </div>
      ) : null}

      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.03em] text-[var(--color-base-content)] sm:text-[1.6rem]">
        {title ?? 'Sign in'}
      </h1>

      {subtitle ? (
        <p className="mt-1 text-base font-medium text-[var(--auth-muted)] sm:mt-0.5 sm:text-[0.9375rem] lg:text-base">
          {subtitle}
        </p>
      ) : null}

      {description ? (
        <div className="mt-1 max-w-sm text-sm leading-5 text-[var(--auth-muted)]">
          {description}
        </div>
      ) : null}
    </div>
  )
}

/** Derive up to two uppercase initials from an app name (e.g. "Console" → "MC"). */
function appInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '876'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Renders the logo for the app a user is signing in to access, for use as the
 * {@link AuthUIConfig.appLogo}. Every 876-powered app — internal or customer
 * facing — sets its own branding, so the source resolves through a fallback
 * chain:
 *
 * 1. `custom` — an explicit logo node, when an app ships its own mark.
 * 2. `src` — the app's logo image (e.g. the API `logoUrl` from `apps.logo_url`).
 * 3. initials derived from `name` — the default when no image is configured.
 */
export function AppLogo({
  name,
  src,
  custom,
}: {
  /** The app's display name; also the source of the initials fallback. */
  name: string
  /** Logo image URL, typically the app's `logoUrl` from the API. */
  src?: string | null
  /** An explicit logo node that takes precedence over `src` and initials. */
  custom?: ReactNode
}) {
  if (custom) return <>{custom}</>

  if (src) {
    return (
      // Plain <img>: this shared package is framework-agnostic (no next/image).
      <img src={src} alt="" className="h-7 w-7 rounded-md object-contain" />
    )
  }

  return (
    <span className="text-sm font-black tracking-tight text-[var(--color-primary)]">
      {appInitials(name)}
    </span>
  )
}

/**
 * Animated wrapper around a single step's form. Mounts only when active so the
 * `auth-step-in` keyframe (defined in the app theme) plays on each transition.
 */
export function StepShell({
  active,
  name,
  children,
}: {
  active: string
  name: string
  children: ReactNode
}) {
  if (active !== name) return null

  return (
    <div className="animate-[auth-step-in_180ms_ease-out] max-sm:flex max-sm:flex-1 max-sm:flex-col">
      {children}
    </div>
  )
}

/**
 * Contained email chip — shows who the user is continuing as, with a
 * "Change" link to return to the email step. Visually anchors the current
 * identity away from the header.
 */
export function IdentityRow({
  identity,
  onBack,
}: {
  identity: string
  onBack: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--auth-muted)]">
        <span className="truncate font-medium">{identity}</span>
        <button
          type="button"
          onClick={onBack}
          className="auth-link auth-link-primary inline-flex items-center gap-1"
        >
          <ArrowLeft aria-hidden="true" className="h-3 w-3" />
          Use another account
        </button>
      </div>
    </div>
  )
}

/**
 * Transient inline notice — error, success, or info. Left accent bar
 * communicates type at a glance; no redundant heading.
 */
export function Notice({ notice }: { notice: FlowNotice }) {
  if (!notice) return null

  const isError = notice.type === 'error'
  const isSuccess = notice.type === 'success'

  const bgColor = isError
    ? 'color-mix(in oklab, var(--color-error) 8%, var(--auth-card-surface))'
    : isSuccess
      ? 'color-mix(in oklab, var(--color-primary) 7%, var(--auth-card-surface))'
      : 'var(--auth-card-surface)'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="mt-4 animate-[auth-notice-in_180ms_ease-out] overflow-hidden rounded-2xl border px-3.5 py-3 text-sm"
      style={{
        background: bgColor,
        borderColor: isError
          ? 'color-mix(in oklab, var(--color-error) 30%, var(--auth-card-border))'
          : 'var(--auth-card-border)',
        boxShadow: isError
          ? `0 12px 30px color-mix(in oklab, var(--color-error) 10%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.35)`
          : `inset 0 1px 0 rgb(255 255 255 / 0.35)`,
      }}
    >
      <p className="leading-5 text-[var(--auth-muted)]">{notice.message}</p>
    </div>
  )
}

/**
 * Alert with icon, title, and children body. For informational messages (not
 * transient notices).
 */
export function AuthAlert({
  children,
  icon,
  title,
  variant,
}: {
  children: ReactNode
  icon: ReactNode
  title: string
  variant: 'error' | 'info'
}) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`auth-alert animate-[auth-notice-in_180ms_ease-out] gap-3 ${variant === 'error' ? 'auth-alert-error' : 'auth-alert-info'}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <div className="font-semibold tracking-[-0.01em]">{title}</div>
        <div className="text-sm leading-5 text-[var(--auth-muted)]">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Footer text at the bottom of the form pane — used for links like
 * "Back to login" or "Don't have an account?".
 */
export function AuthFooterLink({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm leading-6 text-[var(--auth-muted)]">{children}</div>
  )
}

/**
 * Field-level validation error message.
 */
export function FieldError({ errors, id }: { errors: unknown[]; id?: string }) {
  const message = errors.find((error) => typeof error === 'string')

  if (!message) return null

  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 text-sm font-medium text-[var(--color-error)]"
    >
      {message}
    </p>
  )
}

const OTP_LENGTH = 6

function normalizeOtpValue(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_LENGTH)
}

/**
 * 6-slot OTP input matching the consumer app's `OtpInput` design.
 */
export function OtpField({
  id,
  name,
  value,
  disabled,
  autoFocus,
  ariaDescribedBy,
  ariaInvalid,
  onBlur,
  onChange,
}: {
  id: string
  name: string
  value: string
  disabled?: boolean
  autoFocus?: boolean
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  onBlur: (event: FocusEvent<HTMLInputElement>) => void
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="auth-fieldset p-0">
      <label htmlFor={id} className="auth-fieldset-legend">
        6-digit code
      </label>
      <InputOTP
        id={id}
        name={name}
        value={value}
        maxLength={OTP_LENGTH}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        containerClassName="w-full"
        className="caret-transparent focus-visible:ring-0"
        pasteTransformer={normalizeOtpValue}
        onBlur={onBlur}
        onChange={(nextValue) => onChange(normalizeOtpValue(nextValue))}
      >
        <InputOTPGroup className="grid w-full grid-cols-6 gap-1.5 rounded-none min-[380px]:gap-2">
          {Array.from({ length: OTP_LENGTH }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className="h-11 w-full rounded-xl border border-[var(--auth-input-border)] bg-[var(--auth-input-surface)] text-base font-bold text-[var(--color-base-content)] tabular-nums shadow-none transition-[border-color,box-shadow,transform] duration-150 first:rounded-xl last:rounded-xl aria-invalid:border-[var(--color-error)] data-[active=true]:border-[var(--color-primary)] data-[active=true]:shadow-[0_0_24px_color-mix(in_oklab,var(--color-primary)_18%,transparent)] data-[active=true]:ring-[3px] data-[active=true]:ring-[color-mix(in_oklab,var(--color-primary)_22%,transparent)] data-[active=true]:aria-invalid:border-[var(--color-error)] [&:not(:empty)]:animate-[auth-slot-pop_180ms_ease-out]"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </fieldset>
  )
}

/**
 * Password field with Lock icon prefix and show/hide toggle suffix. Uses
 * `@876/ui` InputGroup matching the consumer app's PasswordInput design.
 */
export function PasswordField({
  id,
  name,
  value,
  disabled,
  autoComplete,
  autoFocus,
  required,
  ariaDescribedBy,
  ariaInvalid,
  className,
  onBlur,
  onChange,
  label = 'Password',
}: {
  id: string
  name: string
  value: string
  disabled?: boolean
  autoComplete?: string
  autoFocus?: boolean
  required?: boolean
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  className?: string
  onBlur: (event: FocusEvent<HTMLInputElement>) => void
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  label?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <fieldset className="auth-fieldset p-0">
      <label htmlFor={id} className="auth-fieldset-legend mb-1.5 block">
        {label}
      </label>
      <InputGroup className="h-10 rounded-[var(--radius-field)] bg-transparent">
        <InputGroupAddon>
          <Lock
            aria-hidden="true"
            className="h-[1em] text-[color-mix(in_oklab,var(--color-base-content)_74%,var(--color-primary)_24%)]"
          />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid || undefined}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          disabled={disabled}
          className={className}
          onBlur={onBlur}
          onChange={onChange}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-sm"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            disabled={disabled}
            className="rounded-full text-[color-mix(in_oklab,var(--color-base-content)_72%,var(--color-primary)_20%)] hover:bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)] hover:text-[var(--color-base-content)] focus-visible:text-[var(--color-base-content)]"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </fieldset>
  )
}

/**
 * Stable auth action row. Secondary text links occupy the left slot while the
 * submit button stays pinned to the right across steps and viewport sizes.
 */
export function AuthActionRow({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode
  secondary?: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        'grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex min-w-0 items-center">{secondary}</div>
      <div className="flex shrink-0 justify-end">{primary}</div>
    </div>
  )
}

/**
 * Primary submit button with built-in busy state.
 */
export function SubmitButton({
  busy,
  children,
  className,
  disabled,
  variant = 'primary',
}: {
  busy: boolean
  children: ReactNode
  className?: string
  disabled?: boolean
  variant?: 'primary' | 'neutral'
}) {
  const buttonClassName = [
    'auth-btn',
    variant === 'neutral' ? 'auth-btn-neutral' : 'auth-btn-primary',
    className ?? 'w-fit min-w-28 px-5',
    'gap-2',
  ].join(' ')

  return (
    <button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      className={buttonClassName}
    >
      {busy ? (
        <span aria-hidden="true" className="auth-spinner auth-spinner-sm" />
      ) : null}
      {children}
    </button>
  )
}

/**
 * A labeled text input row matching the app's `auth-fieldset` style.
 */
export const Field = forwardRef<
  HTMLInputElement,
  {
    label: string
    icon?: ReactNode
  } & InputHTMLAttributes<HTMLInputElement>
>(function Field({ label, icon, id, ...props }, ref) {
  return (
    <fieldset
      className="auth-fieldset min-w-0 p-0"
      style={{ rowGap: '0.75rem' }}
    >
      <label htmlFor={id} className="auth-fieldset-legend">
        {label}
      </label>
      <div className="auth-field w-full gap-3">
        {icon ? (
          <span className="text-[color-mix(in_oklab,var(--color-base-content)_74%,var(--color-primary)_24%)]">
            {icon}
          </span>
        ) : null}
        <input ref={ref} id={id} className="min-w-0 grow" {...props} />
      </div>
    </fieldset>
  )
})

/**
 * Submit-on-Enter form wrapper that ignores Enter inside textareas/buttons.
 */
export function StepForm({
  onSubmit,
  children,
  className,
}: {
  onSubmit: () => void
  children: ReactNode
  className?: string
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter') return
    if (event.nativeEvent.isComposing) return

    const target = event.target
    if (!(target instanceof HTMLElement)) return

    const tagName = target.tagName.toLowerCase()
    if (tagName === 'textarea' || tagName === 'button') return

    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      className={['space-y-4', className].filter(Boolean).join(' ')}
      noValidate
      onKeyDown={handleKeyDown}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {children}
    </form>
  )
}
