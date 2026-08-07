import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './auth.controller'
import * as docs from './auth.docs'
import {
  authEventResponseSchema,
  authRefreshResponseSchema,
  authSessionResponseSchema,
  callbackBodySchema,
  emailResolveBodySchema,
  emailResolveResponseSchema,
  emptyResponseSchema,
  loginBodySchema,
  magicOtpSendBodySchema,
  magicOtpSendResponseSchema,
  magicOtpVerifyBodySchema,
  myDeviceResponseSchema,
  mySessionDeletedSchema,
  mySessionResponseSchema,
  oauthSessionBodySchema,
  recoverBodySchema,
  recoverResponseSchema,
  refreshBodySchema,
  registerBodySchema,
  registerBusinessBodySchema,
  resetPasswordBodySchema,
  resetPasswordResponseSchema,
  routingMembershipsQuerySchema,
  routingMembershipsResponseSchema,
  sessionDataResponseSchema,
  sessionSignoutResponseSchema,
  sessionSwitchResponseSchema,
  sidParamsSchema,
  sessionIdParamsSchema,
  socialLoginBodySchema,
  socialLoginResponseSchema,
  socialProviderResponseSchema,
  switchSessionBodySchema,
  verifiedUserResponseSchema,
  verifyEmailBodySchema,
} from './auth.schemas'

/**
 * Auth module — ported from `domains/auth/router.py`.
 *
 * Every route lives under `/auth` and sits behind the app API key (the
 * `protected_router` in `api/v1.py`). Additional tiers are declared per route:
 * `session` for the self-service account-security views, `admin` for the
 * routing memberships endpoint, `apiKey` for everything else.
 */

export function createAuthRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Auth',
    prefix: '/auth',
    security: 'apiKey',
    resolveGuards,
  })

  // POST /auth/resolve — apiKey
  api.post({
    path: '/resolve',
    operationId: 'auth-resolve_email',
    summary: 'Resolve email access',
    description: docs.RESOLVE_EMAIL_DESCRIPTION,
    request: { body: emailResolveBodySchema },
    responses: {
      200: {
        description: 'Email resolved successfully.',
        schema: emailResolveResponseSchema,
      },
      400: docs.RESOLVE_EMAIL_RESPONSES[400],
      403: docs.RESOLVE_EMAIL_RESPONSES[403],
      404: docs.RESOLVE_EMAIL_RESPONSES[404],
    },
    handler: controller.resolveEmail,
  })

  // POST /auth/login — apiKey, rate limited
  api.post({
    path: '/login',
    operationId: 'auth-login',
    summary: 'Password login',
    description: docs.LOGIN_DESCRIPTION,
    request: { body: loginBodySchema },
    responses: {
      200: {
        description:
          'Authentication successful. Returns session envelope or auth_event.',
      },
      401: docs.LOGIN_RESPONSES[401],
      403: docs.LOGIN_RESPONSES[403],
    },
    handler: controller.login,
  })

  // POST /auth/oauth/session — apiKey
  api.post({
    path: '/oauth/session',
    operationId: 'auth-create_session_from_oauth',
    summary: docs.OAUTH_SESSION_SUMMARY,
    description: docs.OAUTH_SESSION_DESCRIPTION,
    request: { body: oauthSessionBodySchema },
    responses: {
      200: {
        description: 'Session established; sets the session cookie.',
        schema: authSessionResponseSchema,
      },
      401: docs.OAUTH_SESSION_RESPONSES[401],
      403: docs.OAUTH_SESSION_RESPONSES[403],
    },
    handler: controller.createSessionFromOAuth,
  })

  // POST /auth/register — apiKey
  api.post({
    path: '/register',
    operationId: 'auth-register',
    summary: 'Register consumer account',
    description: docs.REGISTER_DESCRIPTION,
    request: { body: registerBodySchema },
    responses: {
      200: {
        description:
          'Registration successful. Returns session envelope or auth_event.',
      },
      400: docs.REGISTER_RESPONSES[400],
      403: docs.REGISTER_RESPONSES[403],
      409: docs.REGISTER_RESPONSES[409],
    },
    handler: controller.register,
  })

  // POST /auth/register-business — apiKey
  api.post({
    path: '/register-business',
    operationId: 'auth-register_business',
    summary: 'Register business account',
    description: docs.REGISTER_BUSINESS_DESCRIPTION,
    request: { body: registerBusinessBodySchema },
    responses: {
      200: {
        description:
          'Business registration successful. Returns session or auth_event.',
      },
      400: docs.REGISTER_BUSINESS_RESPONSES[400],
      403: docs.REGISTER_BUSINESS_RESPONSES[403],
      409: docs.REGISTER_BUSINESS_RESPONSES[409],
    },
    handler: controller.registerBusiness,
  })

  // POST /auth/social-login — apiKey
  api.post({
    path: '/social-login',
    operationId: 'auth-social_login',
    summary: 'Get OAuth provider URL',
    description: docs.SOCIAL_LOGIN_DESCRIPTION,
    request: { body: socialLoginBodySchema },
    responses: {
      200: {
        description: 'Authorization URL generated.',
        schema: socialLoginResponseSchema,
      },
      403: docs.SOCIAL_LOGIN_RESPONSES[403],
      500: docs.SOCIAL_LOGIN_RESPONSES[500],
    },
    handler: controller.socialLogin,
  })

  // GET /auth/providers — apiKey
  api.get({
    path: '/providers',
    operationId: 'auth-list_providers',
    summary: 'List social providers',
    description:
      'Lists the social/SSO providers currently enabled for sign-in, in display order.',
    responses: {
      200: {
        description: 'Enabled social providers.',
        schema: listObjectSchema(socialProviderResponseSchema),
      },
    },
    handler: controller.listProviders,
  })

  // POST /auth/magic-otp/send — apiKey
  api.post({
    path: '/magic-otp/send',
    operationId: 'auth-send_magic_otp',
    summary: 'Send magic OTP',
    description: docs.MAGIC_OTP_SEND_DESCRIPTION,
    request: { body: magicOtpSendBodySchema },
    responses: {
      200: { description: 'OTP sent.', schema: magicOtpSendResponseSchema },
      400: docs.MAGIC_OTP_SEND_RESPONSES[400],
      403: docs.MAGIC_OTP_SEND_RESPONSES[403],
      429: docs.MAGIC_OTP_SEND_RESPONSES[429],
    },
    handler: controller.sendMagicOtp,
  })

  // POST /auth/magic-otp/verify — apiKey, rate limited
  api.post({
    path: '/magic-otp/verify',
    operationId: 'auth-verify_magic_otp',
    summary: 'Verify magic OTP',
    description: docs.MAGIC_OTP_VERIFY_DESCRIPTION,
    request: { body: magicOtpVerifyBodySchema },
    responses: {
      200: { description: 'OTP verified. Returns the WorkOS user.' },
      400: docs.MAGIC_OTP_VERIFY_RESPONSES[400],
      401: docs.MAGIC_OTP_VERIFY_RESPONSES[401],
    },
    handler: controller.verifyMagicOtp,
  })

  // POST /auth/recover — apiKey, rate limited
  api.post({
    path: '/recover',
    operationId: 'auth-recover',
    summary: 'Send password recovery email',
    description: docs.RECOVER_DESCRIPTION,
    request: { body: recoverBodySchema },
    responses: {
      200: {
        description: 'Recovery email dispatched.',
        schema: recoverResponseSchema,
      },
      400: docs.RECOVER_RESPONSES[400],
      403: docs.RECOVER_RESPONSES[403],
    },
    handler: controller.recover,
  })

  // POST /auth/reset-password — apiKey, rate limited
  api.post({
    path: '/reset-password',
    operationId: 'auth-reset_password',
    summary: 'Reset password',
    description: docs.RESET_PASSWORD_DESCRIPTION,
    request: { body: resetPasswordBodySchema },
    responses: {
      200: {
        description: 'Password reset successfully.',
        schema: resetPasswordResponseSchema,
      },
      400: docs.RESET_PASSWORD_RESPONSES[400],
      401: docs.RESET_PASSWORD_RESPONSES[401],
    },
    handler: controller.resetPassword,
  })

  // POST /auth/verify-email — apiKey, rate limited
  api.post({
    path: '/verify-email',
    operationId: 'auth-verify_email',
    summary: 'Verify email address',
    description: docs.VERIFY_EMAIL_DESCRIPTION,
    request: { body: verifyEmailBodySchema },
    responses: {
      200: { description: 'Email verified. Returns the WorkOS user.' },
      400: docs.VERIFY_EMAIL_RESPONSES[400],
      401: docs.VERIFY_EMAIL_RESPONSES[401],
      403: docs.VERIFY_EMAIL_RESPONSES[403],
    },
    handler: controller.verifyEmail,
  })

  // POST /auth/callback — apiKey
  api.post({
    path: '/callback',
    operationId: 'auth-callback',
    summary: 'WorkOS OAuth callback',
    description: docs.CALLBACK_DESCRIPTION,
    request: { body: callbackBodySchema },
    responses: {
      200: {
        description: 'Code exchanged. Returns access/refresh tokens and user.',
        schema: authSessionResponseSchema,
      },
      400: docs.CALLBACK_RESPONSES[400],
      401: docs.CALLBACK_RESPONSES[401],
    },
    handler: controller.callback,
  })

  // GET /auth/session — apiKey (reads cookie, not session guard)
  api.get({
    path: '/session',
    operationId: 'auth-get_session',
    summary: 'Get current session',
    description: docs.SESSION_DESCRIPTION,
    responses: {
      200: {
        description: 'Session payload.',
        schema: sessionDataResponseSchema,
      },
      401: docs.SESSION_RESPONSES[401],
    },
    handler: controller.getSession,
  })

  // POST /auth/refresh — apiKey
  api.post({
    path: '/refresh',
    operationId: 'auth-refresh',
    summary: 'Refresh access token',
    description: docs.REFRESH_DESCRIPTION,
    request: { body: refreshBodySchema },
    responses: {
      200: {
        description: 'Token refreshed.',
        schema: authRefreshResponseSchema,
      },
      400: docs.REFRESH_RESPONSES[400],
      401: docs.REFRESH_RESPONSES[401],
    },
    handler: controller.refresh,
  })

  // POST /auth/logout — apiKey
  api.post({
    path: '/logout',
    operationId: 'auth-logout',
    summary: 'Sign out',
    description:
      'Signs out every account in the set: deletes their session rows and clears the cookie.',
    responses: {
      200: { description: 'Signed out.', schema: emptyResponseSchema },
    },
    handler: controller.logout,
  })

  // POST /auth/sessions/switch — apiKey (requires cookie)
  api.post({
    path: '/sessions/switch',
    operationId: 'auth-switch_session',
    summary: 'Switch active account',
    description:
      'Makes another already-signed-in account active without re-authenticating.',
    request: { body: switchSessionBodySchema },
    responses: {
      200: {
        description: 'Session switched.',
        schema: sessionSwitchResponseSchema,
      },
      401: { description: 'No active session.' },
      404: { description: 'Account not signed in on this device.' },
    },
    handler: controller.switchSession,
  })

  // POST /auth/sessions/:sid/signout — apiKey (requires cookie)
  api.post({
    path: '/sessions/:sid/signout',
    operationId: 'auth-signout_session',
    summary: 'Sign out one account',
    description: 'Signs out a single account from the set.',
    request: { params: sidParamsSchema },
    responses: {
      200: {
        description: 'Account signed out.',
        schema: sessionSignoutResponseSchema,
      },
      401: { description: 'No active session.' },
      404: { description: 'Account not signed in on this device.' },
    },
    handler: controller.signoutSession,
  })

  // GET /auth/routing/memberships — admin
  api.get({
    path: '/routing/memberships',
    security: 'admin',
    operationId: 'auth-get_routing_memberships',
    summary: 'List memberships for routing',
    description: docs.ROUTING_MEMBERSHIPS_DESCRIPTION,
    request: { query: routingMembershipsQuerySchema },
    responses: {
      200: {
        description: 'Memberships with organizations returned.',
        schema: routingMembershipsResponseSchema,
      },
      400: docs.ROUTING_MEMBERSHIPS_RESPONSES[400],
      401: { description: 'Missing or invalid credentials.' },
    },
    handler: controller.getRoutingMemberships,
  })

  // GET /auth/me/devices — session
  api.get({
    path: '/me/devices',
    security: 'session',
    operationId: 'auth-list_my_devices',
    summary: 'List my devices',
    description:
      'Returns the devices the authenticated account has signed in from.',
    responses: {
      200: {
        description: 'Devices returned.',
        schema: listObjectSchema(myDeviceResponseSchema),
      },
      401: { description: 'No active session.' },
    },
    handler: controller.listMyDevices,
  })

  // GET /auth/me/sessions — session
  api.get({
    path: '/me/sessions',
    security: 'session',
    operationId: 'auth-list_my_sessions',
    summary: 'List my sessions',
    description:
      "Returns the authenticated account's active sessions, newest first.",
    responses: {
      200: {
        description: 'Sessions returned.',
        schema: listObjectSchema(mySessionResponseSchema),
      },
      401: { description: 'No active session.' },
    },
    handler: controller.listMySessions,
  })

  // DELETE /auth/me/sessions/:session_id — session
  api.delete({
    path: '/me/sessions/:session_id',
    security: 'session',
    operationId: 'auth-revoke_my_session',
    summary: 'Revoke one of my sessions',
    description:
      'Signs the authenticated account out of one of its own sessions.',
    request: { params: sessionIdParamsSchema },
    responses: {
      200: { description: 'Session revoked.', schema: mySessionDeletedSchema },
      401: { description: 'No active session.' },
      404: { description: 'Session not found.' },
    },
    handler: controller.revokeMySession,
  })

  return api.router
}
