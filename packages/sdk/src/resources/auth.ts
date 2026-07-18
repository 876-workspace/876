import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import type {
  GetSessionResult,
  ListProvidersResult,
  LoginParams,
  LoginResult,
  LogoutParams,
  LogoutResult,
  OAuthSessionParams,
  OAuthSessionResult,
  RecoverParams,
  RecoverResult,
  RegisterBusinessParams,
  RegisterBusinessResult,
  RegisterParams,
  RegisterResult,
  ResetPasswordParams,
  ResetPasswordResult,
  ResolveParams,
  ResolveResult,
  SendMagicOtpParams,
  SendMagicOtpResult,
  SocialLoginParams,
  SocialLoginResult,
  SocialProvider,
  VerifyEmailCodeParams,
  VerifyEmailCodeResult,
  VerifyMagicOtpParams,
  VerifyMagicOtpResult,
} from '../types/auth.ts'
import {
  auth876GetSessionResponseSchema,
  auth876ListProvidersResponseSchema,
  auth876LoginParamsSchema,
  auth876LoginResponseSchema,
  auth876LogoutParamsSchema,
  auth876LogoutResponseSchema,
  auth876OAuthSessionParamsSchema,
  auth876OAuthSessionResponseSchema,
  auth876RecoverParamsSchema,
  auth876RecoverResponseSchema,
  auth876RegisterBusinessParamsSchema,
  auth876RegisterParamsSchema,
  auth876RegisterResponseSchema,
  auth876ResetPasswordParamsSchema,
  auth876ResetPasswordResponseSchema,
  auth876ResolveParamsSchema,
  auth876ResolveResponseSchema,
  auth876SendMagicOtpParamsSchema,
  auth876SendMagicOtpResponseSchema,
  auth876SocialLoginParamsSchema,
  auth876SocialLoginResponseSchema,
  auth876VerifyEmailCodeParamsSchema,
  auth876VerifyEmailCodeResponseSchema,
  auth876VerifyMagicOtpParamsSchema,
  auth876VerifyMagicOtpResponseSchema,
} from '../types/auth.ts'
import {
  validateAuthParams,
  validateParams,
  withIdentifierAwareInvalidCredentials,
} from '../validation.ts'

/** Endpoint paths on the 876 API (resolved against the internal base URL). */
const apiEndpoints = {
  login: '/auth/login',
  register: '/auth/register',
  registerBusiness: '/auth/register-business',
  socialLogin: '/auth/social-login',
  providers: '/auth/providers',
  verifyEmailCode: '/auth/verify-email',
  recover: '/auth/recover',
  resetPassword: '/auth/reset-password',
  logout: '/auth/logout',
  getSession: '/auth/session',
  oauthSession: '/auth/oauth/session',
  resolve: '/auth/resolve',
  sendMagicOtp: '/auth/magic-otp/send',
  verifyMagicOtp: '/auth/magic-otp/verify',
} as const

/** `$876.auth.*` — login, registration, social login, session, OTP flows. */
export function createAuthResource(runtime: SdkRuntime) {
  /** Shared implementation behind `socialLogin`, `social`, and `loginWith*`. */
  function runSocialLogin(
    params: SocialLoginParams,
    requestOptions?: RequestOptions
  ): Promise<SocialLoginResult> {
    const validation = validateParams(auth876SocialLoginParamsSchema, params)
    if (validation.error) return Promise.resolve(validation)
    return sendAuthRequest(
      runtime,
      'POST',
      apiEndpoints.socialLogin,
      validation.data,
      auth876SocialLoginResponseSchema,
      requestOptions
    )
  }

  return {
    /**
     * Authenticates a user with username-or-email and password.
     *
     * Returns either a `session` when login completes or an `auth_event` when
     * the app must continue the flow, such as email verification. Apps remain
     * responsible for storing cookies/session state and navigating after login.
     *
     * @param params - Identifier and password credentials.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/login
     */
    login(
      params: LoginParams,
      requestOptions?: RequestOptions
    ): Promise<LoginResult> {
      const validation = validateAuthParams(auth876LoginParamsSchema, params, [
        { field: 'identifier', code: 'auth/missing-identifier' },
        { field: 'password', code: 'auth/missing-password' },
      ])
      if (validation.error) return Promise.resolve(validation)
      return withIdentifierAwareInvalidCredentials(
        sendAuthRequest(
          runtime,
          'POST',
          apiEndpoints.login,
          validation.data,
          auth876LoginResponseSchema,
          requestOptions
        ),
        validation.data.identifier
      )
    },

    /**
     * Creates a consumer account with email and password credentials.
     *
     * The API may return a completed `session` or an `auth_event` that requires
     * email verification before the app should treat the user as signed in.
     *
     * @param params - Registration profile and credentials.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/register
     */
    register(
      params: RegisterParams,
      requestOptions?: RequestOptions
    ): Promise<RegisterResult> {
      const validation = validateAuthParams(
        auth876RegisterParamsSchema,
        params,
        [
          { field: 'email', code: 'auth/missing-email' },
          { field: 'password', code: 'auth/missing-password' },
          { field: 'firstName', code: 'auth/missing-first-name' },
          { field: 'lastName', code: 'auth/missing-last-name' },
        ]
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.register,
        validation.data,
        auth876RegisterResponseSchema,
        requestOptions
      )
    },

    /**
     * Creates a business owner account and initial organization.
     *
     * Use this for business onboarding flows where the owner and organization
     * are created together. The response shape matches consumer registration.
     *
     * @param params - Owner credentials plus organization details.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/register-business
     */
    registerBusiness(
      params: RegisterBusinessParams,
      requestOptions?: RequestOptions
    ): Promise<RegisterBusinessResult> {
      const validation = validateParams(
        auth876RegisterBusinessParamsSchema,
        params
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.registerBusiness,
        validation.data,
        auth876RegisterResponseSchema,
        requestOptions
      )
    },

    /**
     * Initiates a social login flow and returns a provider authorization URL.
     *
     * Apps should redirect the browser to the returned provider URL. The SDK
     * only starts the flow; callback handling and session persistence stay in
     * the app/backend boundary.
     *
     * @param params - Provider and return/callback hints.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/social-login
     */
    socialLogin(
      params: SocialLoginParams,
      requestOptions?: RequestOptions
    ): Promise<SocialLoginResult> {
      return runSocialLogin(params, requestOptions)
    },

    /**
     * Lists the social/SSO providers currently enabled for sign-in.
     *
     * Apps and the shared auth UI render these dynamically instead of
     * hardcoding a provider list. Pass a returned provider `id` to `social`.
     *
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope with the provider list.
     * @see GET /auth/providers
     */
    getProviders(
      requestOptions?: RequestOptions
    ): Promise<ListProvidersResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        apiEndpoints.providers,
        undefined,
        auth876ListProvidersResponseSchema,
        requestOptions
      )
    },

    /**
     * Starts a social login flow for the given provider id.
     *
     * Ergonomic wrapper over {@link socialLogin} that takes the provider as a
     * positional argument — pair it with `getProviders` for dynamic provider
     * lists.
     *
     * @param provider - The provider id (e.g. from `getProviders`).
     * @param params - Optional screen/login hints.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     */
    social(
      provider: SocialProvider,
      params: Omit<SocialLoginParams, 'provider'> = {},
      requestOptions?: RequestOptions
    ): Promise<SocialLoginResult> {
      return runSocialLogin({ provider, ...params }, requestOptions)
    },

    /** Starts a Google social login flow. See {@link social}. */
    loginWithGoogle(
      params: Omit<SocialLoginParams, 'provider'> = {},
      requestOptions?: RequestOptions
    ): Promise<SocialLoginResult> {
      return runSocialLogin({ provider: 'google', ...params }, requestOptions)
    },

    /** Starts a Microsoft social login flow. See {@link social}. */
    loginWithMicrosoft(
      params: Omit<SocialLoginParams, 'provider'> = {},
      requestOptions?: RequestOptions
    ): Promise<SocialLoginResult> {
      return runSocialLogin(
        { provider: 'microsoft', ...params },
        requestOptions
      )
    },

    /** Starts an Apple social login flow. See {@link social}. */
    loginWithApple(
      params: Omit<SocialLoginParams, 'provider'> = {},
      requestOptions?: RequestOptions
    ): Promise<SocialLoginResult> {
      return runSocialLogin({ provider: 'apple', ...params }, requestOptions)
    },

    /**
     * Verifies an email verification code to continue or complete auth.
     *
     * Use this after `login`, `register`, or `registerBusiness` returns an
     * `auth_event` requiring email verification.
     *
     * @param params - Email, code, and flow correlation values.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/verify-email
     */
    verifyEmailCode(
      params: VerifyEmailCodeParams,
      requestOptions?: RequestOptions
    ): Promise<VerifyEmailCodeResult> {
      const validation = validateAuthParams(
        auth876VerifyEmailCodeParamsSchema,
        params,
        [
          { field: 'code', code: 'auth/missing-code' },
          {
            field: 'pendingAuthenticationToken',
            code: 'auth/invalid-token',
          },
        ]
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.verifyEmailCode,
        validation.data,
        auth876VerifyEmailCodeResponseSchema,
        requestOptions
      )
    },

    /**
     * Requests a password reset email for an account.
     *
     * This method is intentionally safe for account enumeration; callers should
     * render the same confirmation copy regardless of whether an account exists.
     *
     * @param params - Email or identifier to recover.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/recover
     */
    recover(
      params: RecoverParams,
      requestOptions?: RequestOptions
    ): Promise<RecoverResult> {
      const validation = validateAuthParams(
        auth876RecoverParamsSchema,
        params,
        [{ field: 'email', code: 'auth/missing-email' }]
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.recover,
        validation.data,
        auth876RecoverResponseSchema,
        requestOptions
      )
    },

    /**
     * Completes a password reset using the token from the reset email.
     *
     * On success, apps should send the user through the normal post-reset sign-in
     * or completion path rather than assuming a browser session was created.
     *
     * @param params - Reset token and new password.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/reset-password
     */
    resetPassword(
      params: ResetPasswordParams,
      requestOptions?: RequestOptions
    ): Promise<ResetPasswordResult> {
      const validation = validateAuthParams(
        auth876ResetPasswordParamsSchema,
        params,
        [
          { field: 'token', code: 'auth/invalid-token' },
          { field: 'password', code: 'auth/missing-password' },
        ]
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.resetPassword,
        validation.data,
        auth876ResetPasswordResponseSchema,
        requestOptions
      )
    },

    /**
     * Ends the current session.
     *
     * The API invalidates the server-side session where applicable. Apps should
     * also clear app-owned session cookies/state and navigate to a signed-out
     * route after success.
     *
     * @param params - Optional logout details.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/logout
     */
    logout(
      params: LogoutParams = {},
      requestOptions?: RequestOptions
    ): Promise<LogoutResult> {
      const validation = validateParams(auth876LogoutParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.logout,
        validation.data,
        auth876LogoutResponseSchema,
        requestOptions
      )
    },

    /**
     * Retrieves the current session for the current request context.
     *
     * Browser callers rely on same-origin credentials when configured by the
     * app. Server callers may provide request options with explicit headers.
     *
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope containing a session or null session state.
     * @see GET /auth/session
     */
    getSession(requestOptions?: RequestOptions): Promise<GetSessionResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        apiEndpoints.getSession,
        undefined,
        auth876GetSessionResponseSchema,
        requestOptions
      )
    },

    /**
     * Establishes a first-party session from an OAuth ID token.
     *
     * Server-side relying parties use this after completing the 876 OAuth
     * authorization-code flow. The API validates the ID token and sets the
     * normal session cookie when the caller is an authenticated app.
     *
     * @param params - OAuth ID token returned by `exchangeCodeForToken`.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope containing a session.
     * @see POST /auth/oauth/session
     */
    createSessionFromOAuth(
      params: OAuthSessionParams,
      requestOptions?: RequestOptions
    ): Promise<OAuthSessionResult> {
      const validation = validateParams(auth876OAuthSessionParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.oauthSession,
        { id_token: validation.data.idToken },
        auth876OAuthSessionResponseSchema,
        requestOptions
      )
    },

    /**
     * Resolves a typed identifier to canonical login hints.
     *
     * Use this before credential entry when the UI needs to normalize email or
     * username input and decide which next step to show.
     *
     * @param params - Email or username-like identifier.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/resolve
     */
    resolve(
      params: ResolveParams,
      requestOptions?: RequestOptions
    ): Promise<ResolveResult> {
      const validation = validateAuthParams(
        auth876ResolveParamsSchema,
        params,
        [{ field: 'identifier', code: 'auth/missing-identifier' }]
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.resolve,
        validation.data,
        auth876ResolveResponseSchema,
        requestOptions
      )
    },

    /**
     * Sends a magic one-time passcode to an email address.
     *
     * Apps should render a generic success state and then call
     * `verifyMagicOtp` with the submitted code.
     *
     * @param params - Email address and optional flow metadata.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/magic-otp/send
     */
    sendMagicOtp(
      params: SendMagicOtpParams,
      requestOptions?: RequestOptions
    ): Promise<SendMagicOtpResult> {
      const validation = validateAuthParams(
        auth876SendMagicOtpParamsSchema,
        params,
        [{ field: 'email', code: 'auth/missing-email' }]
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.sendMagicOtp,
        validation.data,
        auth876SendMagicOtpResponseSchema,
        requestOptions
      )
    },

    /**
     * Verifies a magic one-time passcode and completes authentication.
     *
     * Returns a session response when the code is valid. Apps still own cookie
     * handling and post-login navigation.
     *
     * @param params - Email, code, and optional flow metadata.
     * @param requestOptions - Optional per-request fetch options.
     * @returns A `{ data, error }` result envelope.
     * @see POST /auth/magic-otp/verify
     */
    verifyMagicOtp(
      params: VerifyMagicOtpParams,
      requestOptions?: RequestOptions
    ): Promise<VerifyMagicOtpResult> {
      const validation = validateAuthParams(
        auth876VerifyMagicOtpParamsSchema,
        params,
        [
          { field: 'email', code: 'auth/missing-email' },
          { field: 'code', code: 'auth/missing-code' },
        ]
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        apiEndpoints.verifyMagicOtp,
        validation.data,
        auth876VerifyMagicOtpResponseSchema,
        requestOptions
      )
    },
  }
}
