'use client'

/**
 * The progressive auth flow state machine.
 *
 * @module @876/ui/auth/use-auth-flow
 */

import { useCallback, useReducer } from 'react'
import { createAuthError, type SdkAuthErrorCode } from '@876/sdk'

import { useAuthUI } from './context'
import type { AuthIntent, AuthStep, IdentifierResolution, User } from './types'

/** Transient banner shown beneath the active step. */
export type FlowNotice = {
  type: 'error' | 'success' | 'info'
  message: string
} | null

/** In-flight work, used to disable inputs and show spinners. */
export type FlowStatus = 'idle' | 'resolving' | 'submitting'

export type FlowState = {
  step: AuthStep
  intent: AuthIntent
  /** The raw value typed on the email step (email or username). */
  identifier: string
  /** The canonical email resolved from the identifier. */
  email: string
  resolution: IdentifierResolution | null
  /** Token returned by an email-verification challenge, needed to verify codes. */
  pendingToken: string | null
  /** Unix timestamp after which a magic OTP can be resent. */
  canResendAt: number | null
  status: FlowStatus
  notice: FlowNotice
}

type FlowAction =
  | { type: 'set_intent'; intent: AuthIntent }
  | { type: 'set_identifier'; identifier: string }
  | { type: 'resolve_start'; identifier: string }
  | {
      type: 'resolve_done'
      resolution: IdentifierResolution
      step: AuthStep
    }
  | { type: 'submit_start' }
  | { type: 'submit_done' }
  | { type: 'notice'; notice: FlowNotice }
  | { type: 'go'; step: AuthStep }
  | { type: 'challenge'; email: string; pendingToken?: string }
  | { type: 'otp_sent'; email: string; canResendAt: number }
  | { type: 'reset_to_email' }

function invalidCredentialsMessage(identifier: string): string {
  return identifier.trim().includes('@')
    ? 'The email or password you entered is incorrect.'
    : 'The username or password you entered is incorrect.'
}

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'set_intent':
      return { ...state, intent: action.intent, notice: null }
    case 'set_identifier':
      return { ...state, identifier: action.identifier }
    case 'resolve_start':
      return {
        ...state,
        identifier: action.identifier,
        status: 'resolving',
        notice: null,
      }
    case 'resolve_done':
      return {
        ...state,
        status: 'idle',
        resolution: action.resolution,
        email: action.resolution.email,
        step: action.step,
        notice: null,
      }
    case 'submit_start':
      return { ...state, status: 'submitting', notice: null }
    case 'submit_done':
      return { ...state, status: 'idle' }
    case 'notice':
      return { ...state, status: 'idle', notice: action.notice }
    case 'go':
      return { ...state, step: action.step, notice: null }
    case 'challenge':
      return {
        ...state,
        step: 'verify-email',
        status: 'idle',
        notice: null,
        email: action.email,
        pendingToken: action.pendingToken ?? null,
      }
    case 'otp_sent':
      return {
        ...state,
        step: 'otp',
        status: 'idle',
        notice: null,
        email: action.email,
        canResendAt: action.canResendAt,
      }
    case 'reset_to_email':
      return {
        ...state,
        step: 'email',
        status: 'idle',
        notice: null,
        resolution: null,
        pendingToken: null,
      }
  }
}

/**
 * Drives the email-first progressive flow. Returns the current state plus the
 * action handlers each step component calls.
 *
 * The flow:
 * 1. `email` — resolve the identifier, branch to the right next step.
 * 2. `password` / `otp` — authenticate an existing account.
 * 3. `profile` or `org` — create a consumer or business account.
 * 4. `verify-email` — complete an email-verification challenge.
 */
export function useAuthFlow() {
  const { config, capabilities, emit } = useAuthUI()
  const { client } = config

  const [state, dispatch] = useReducer(reducer, {
    step: capabilities.collectsOrg ? 'org' : 'email',
    intent: capabilities.defaultIntent,
    identifier: '',
    email: '',
    resolution: null,
    pendingToken: null,
    canResendAt: null,
    status: 'idle',
    notice: null,
  })

  const succeed = useCallback(
    (user: User, kind: 'sign_in_succeeded' | 'sign_up_succeeded') => {
      emit({ type: kind, user })
      config.onSuccess?.({ user })
    },
    [config, emit]
  )

  const reportUnexpectedError = useCallback(() => {
    const message = 'Unable to reach authentication. Please try again.'

    dispatch({ type: 'notice', notice: { type: 'error', message } })
    emit({ type: 'error', message, code: 'auth/network-error' })
  }, [emit])

  const showAuthError = useCallback(
    (code: SdkAuthErrorCode) => {
      const error = createAuthError(code)

      dispatch({
        type: 'notice',
        notice: { type: 'error', message: error.message },
      })
      emit({ type: 'error', message: error.message, code: error.code })
    },
    [emit]
  )

  const setIdentifier = useCallback((identifier: string) => {
    dispatch({ type: 'set_identifier', identifier })
  }, [])

  /**
   * Handles an email-verification challenge returned by login/register. Gives
   * the host a chance to persist the pending token and redirect to a dedicated
   * page; otherwise falls back to the in-card verify step.
   */
  const handleEmailVerificationChallenge = useCallback(
    (challenge: { email: string; pendingAuthenticationToken?: string }) => {
      emit({
        type: 'email_verification_required',
        email: challenge.email,
        pendingAuthenticationToken: challenge.pendingAuthenticationToken,
      })

      const handledByHost =
        config.onEmailVerificationRequired?.(challenge) ?? false

      // Host took over (persisted + navigating away): skip the in-card step so
      // the verify card never flashes before the redirect resolves.
      if (handledByHost) return

      dispatch({
        type: 'challenge',
        email: challenge.email,
        pendingToken: challenge.pendingAuthenticationToken,
      })
    },
    [config, emit]
  )

  /** Choose the next step for an existing account from its available methods. */
  const stepForResolution = useCallback(
    (resolution: IdentifierResolution): AuthStep => {
      if (!resolution.exists) {
        return capabilities.allowSignUp ? 'profile' : 'password'
      }
      if (resolution.methods.includes('password')) return 'password'
      if (resolution.methods.includes('otp')) return 'otp'
      return 'password'
    },
    [capabilities.allowSignUp]
  )

  const submitEmail = useCallback(
    async (identifier: string) => {
      const trimmed = identifier.trim()
      if (!trimmed) {
        showAuthError('auth/missing-identifier')
        return
      }

      emit({ type: 'email_submitted', identifier: trimmed })

      // Advance straight to the credential step without resolving the
      // identifier server-side — no `/auth/resolve` round-trip is made here.
      // The identifier is validated when the password (sign-in) or profile
      // (sign-up) is submitted. Sign-up intent routes to profile creation;
      // every other intent routes to password entry.
      const resolution: IdentifierResolution = {
        email: trimmed,
        exists: state.intent !== 'sign-up',
        methods: ['password'],
        ssoProvider: null,
      }
      const step = stepForResolution(resolution)
      dispatch({ type: 'resolve_done', resolution, step })
      emit({ type: 'step_changed', step })
    },
    [emit, showAuthError, state.intent, stepForResolution]
  )

  const submitPassword = useCallback(
    async (password: string) => {
      if (!state.identifier.trim()) {
        showAuthError('auth/missing-identifier')
        return
      }

      if (!password.trim()) {
        showAuthError('auth/missing-password')
        return
      }

      dispatch({ type: 'submit_start' })

      try {
        const result = await client.login({
          identifier: state.identifier,
          password,
        })

        if (result.error) {
          const message =
            result.error.code === 'auth/invalid-credentials'
              ? invalidCredentialsMessage(state.identifier)
              : result.error.message

          dispatch({
            type: 'notice',
            notice: { type: 'error', message },
          })
          emit({
            type: 'error',
            message,
            code: result.error.code,
          })
          return
        }

        if (result.data.object === 'auth_event') {
          handleEmailVerificationChallenge({
            email: result.data.email ?? state.identifier,
            pendingAuthenticationToken: result.data.pendingAuthenticationToken,
          })
          return
        }

        dispatch({ type: 'submit_done' })
        succeed(result.data.user, 'sign_in_succeeded')
      } catch {
        reportUnexpectedError()
      }
    },
    [
      client,
      emit,
      handleEmailVerificationChallenge,
      reportUnexpectedError,
      showAuthError,
      state.identifier,
      succeed,
    ]
  )

  const submitProfile = useCallback(
    async (params: {
      email: string
      password: string
      firstName: string
      lastName: string
    }) => {
      if (!params.email.trim()) {
        showAuthError('auth/missing-email')
        return
      }

      if (!params.firstName.trim()) {
        showAuthError('auth/missing-first-name')
        return
      }

      if (!params.lastName.trim()) {
        showAuthError('auth/missing-last-name')
        return
      }

      if (!params.password.trim()) {
        showAuthError('auth/missing-password')
        return
      }

      dispatch({ type: 'submit_start' })

      try {
        const result = await client.register({
          email: params.email,
          password: params.password,
          firstName: params.firstName,
          lastName: params.lastName,
        })

        if (result.error) {
          dispatch({
            type: 'notice',
            notice: { type: 'error', message: result.error.message },
          })
          emit({
            type: 'error',
            message: result.error.message,
            code: result.error.code,
          })
          return
        }

        if (result.data.object === 'auth_event') {
          handleEmailVerificationChallenge({
            email: result.data.email ?? params.email,
            pendingAuthenticationToken: result.data.pendingAuthenticationToken,
          })
          return
        }

        dispatch({ type: 'submit_done' })
        succeed(result.data.user, 'sign_up_succeeded')
      } catch {
        reportUnexpectedError()
      }
    },
    [
      client,
      emit,
      handleEmailVerificationChallenge,
      reportUnexpectedError,
      showAuthError,
      succeed,
    ]
  )

  const submitBusinessProfile = useCallback(
    async (params: {
      email: string
      password: string
      firstName: string
      lastName: string
      organizationName: string
    }) => {
      if (!params.email.trim()) {
        showAuthError('auth/missing-email')
        return
      }

      if (!params.firstName.trim()) {
        showAuthError('auth/missing-first-name')
        return
      }

      if (!params.lastName.trim()) {
        showAuthError('auth/missing-last-name')
        return
      }

      if (!params.organizationName.trim()) {
        showAuthError('auth/missing-organization-name')
        return
      }

      if (!params.password.trim()) {
        showAuthError('auth/missing-password')
        return
      }

      dispatch({ type: 'submit_start' })

      try {
        const result = await client.registerBusiness({
          email: params.email,
          password: params.password,
          firstName: params.firstName,
          lastName: params.lastName,
          organizationName: params.organizationName,
        })

        if (result.error) {
          dispatch({
            type: 'notice',
            notice: { type: 'error', message: result.error.message },
          })
          emit({
            type: 'error',
            message: result.error.message,
            code: result.error.code,
          })
          return
        }

        if (result.data.object === 'auth_event') {
          handleEmailVerificationChallenge({
            email: result.data.email ?? params.email,
            pendingAuthenticationToken: result.data.pendingAuthenticationToken,
          })
          return
        }

        dispatch({ type: 'submit_done' })
        succeed(result.data.user, 'sign_up_succeeded')
      } catch {
        reportUnexpectedError()
      }
    },
    [
      client,
      emit,
      handleEmailVerificationChallenge,
      reportUnexpectedError,
      showAuthError,
      succeed,
    ]
  )

  /** Sends a magic OTP to the given email/identifier and navigates to the otp step. */
  const sendMagicOtp = useCallback(
    async (identifier: string) => {
      const trimmed = identifier.trim()
      if (!trimmed) {
        showAuthError('auth/missing-identifier')
        return
      }

      // Send the OTP to the identifier as entered; the API resolves a username
      // to its canonical email server-side when issuing the code. No
      // `/auth/resolve` round-trip is made here.
      const email = trimmed

      dispatch({ type: 'submit_start' })

      try {
        const result = await client.sendMagicOtp({ email })

        if (result.error) {
          dispatch({
            type: 'notice',
            notice: { type: 'error', message: result.error.message },
          })
          emit({
            type: 'error',
            message: result.error.message,
            code: result.error.code,
          })
          return
        }

        dispatch({
          type: 'otp_sent',
          email: result.data.email,
          canResendAt: result.data.canResendAt,
        })
        emit({ type: 'step_changed', step: 'otp' })
      } catch {
        reportUnexpectedError()
      }
    },
    [client, emit, reportUnexpectedError, showAuthError]
  )

  /** Verifies a magic OTP code and signs the user in. */
  const submitMagicOtp = useCallback(
    async (code: string) => {
      if (!code.trim()) {
        showAuthError('auth/missing-code')
        return
      }

      if (!state.email.trim()) {
        showAuthError('auth/missing-email')
        return
      }

      dispatch({ type: 'submit_start' })

      try {
        const result = await client.verifyMagicOtp({
          code: code.trim(),
          email: state.email,
        })

        if (result.error) {
          dispatch({
            type: 'notice',
            notice: { type: 'error', message: result.error.message },
          })
          emit({
            type: 'error',
            message: result.error.message,
            code: result.error.code,
          })
          return
        }

        dispatch({ type: 'submit_done' })
        succeed(result.data.user, 'sign_in_succeeded')
      } catch {
        reportUnexpectedError()
      }
    },
    [client, emit, reportUnexpectedError, showAuthError, state.email, succeed]
  )

  /** Verifies an email-verification code (post-registration challenge). */
  const submitVerifyCode = useCallback(
    async (code: string) => {
      if (!code.trim()) {
        showAuthError('auth/missing-code')
        return
      }

      if (!state.pendingToken) {
        dispatch({
          type: 'notice',
          notice: {
            type: 'error',
            message: 'This verification session expired. Start again.',
          },
        })
        return
      }

      dispatch({ type: 'submit_start' })

      try {
        const result = await client.verifyEmailCode({
          code: code.trim(),
          pendingAuthenticationToken: state.pendingToken,
        })

        if (result.error) {
          dispatch({
            type: 'notice',
            notice: { type: 'error', message: result.error.message },
          })
          emit({
            type: 'error',
            message: result.error.message,
            code: result.error.code,
          })
          return
        }

        dispatch({ type: 'submit_done' })
        succeed(result.data.user, 'sign_in_succeeded')
      } catch {
        reportUnexpectedError()
      }
    },
    [
      client,
      emit,
      reportUnexpectedError,
      showAuthError,
      state.pendingToken,
      succeed,
    ]
  )

  const recover = useCallback(
    async (email: string) => {
      if (!email.trim()) {
        showAuthError('auth/missing-email')
        return
      }

      dispatch({ type: 'submit_start' })

      try {
        const result = await client.recover({ email })

        if (result.error) {
          dispatch({
            type: 'notice',
            notice: { type: 'error', message: result.error.message },
          })
          emit({
            type: 'error',
            message: result.error.message,
            code: result.error.code,
          })
          return
        }

        dispatch({
          type: 'notice',
          notice: {
            type: 'success',
            message: 'Check your email for a link to reset your password.',
          },
        })
      } catch {
        reportUnexpectedError()
      }
    },
    [client, emit, reportUnexpectedError, showAuthError]
  )

  const startSocial = useCallback(
    async (provider: Parameters<typeof client.socialLogin>[0]['provider']) => {
      dispatch({ type: 'submit_start' })

      try {
        const result = await client.socialLogin({ provider })
        if (result.error) {
          dispatch({
            type: 'notice',
            notice: { type: 'error', message: result.error.message },
          })
          emit({
            type: 'error',
            message: result.error.message,
            code: result.error.code,
          })
          return
        }
        window.location.assign(result.data.url)
      } catch {
        reportUnexpectedError()
      }
    },
    [client, emit, reportUnexpectedError]
  )

  const setIntent = useCallback((intent: AuthIntent) => {
    dispatch({ type: 'set_intent', intent })
  }, [])

  const goTo = useCallback(
    (step: AuthStep) => {
      dispatch({ type: 'go', step })
      emit({ type: 'step_changed', step })
    },
    [emit]
  )

  const backToEmail = useCallback(() => {
    dispatch({ type: 'reset_to_email' })
    emit({ type: 'step_changed', step: 'email' })
  }, [emit])

  return {
    state,
    capabilities,
    actions: {
      submitEmail,
      submitPassword,
      submitProfile,
      submitBusinessProfile,
      submitVerifyCode,
      sendMagicOtp,
      submitMagicOtp,
      recover,
      startSocial,
      setIntent,
      setIdentifier,
      goTo,
      backToEmail,
    },
  }
}

export type AuthFlowController = ReturnType<typeof useAuthFlow>
