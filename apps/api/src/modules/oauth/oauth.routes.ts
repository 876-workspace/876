import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'

import * as controller from './oauth.controller'
import * as docs from './oauth.docs'
import {
  authorizeQuerySchema,
  authorizeResponseSchema,
  consentBodySchema,
  consentDetailsSchema,
  consentQuerySchema,
  endSessionQuerySchema,
  introspectResponseSchema,
  revokeResponseSchema,
  tokenActionBodySchema,
  tokenBodySchema,
  tokenResponseSchema,
  userinfoResponseSchema,
} from './oauth.schemas'

/**
 * The OAuth Authorization Server.
 *
 * Every route is `public` in the platform's tier vocabulary, because an OIDC
 * client or a resource server cannot present a first-party 876 API key. Each
 * endpoint carries its own credential rule instead:
 *
 *   - `/authorize` and `/consent*` require the **internal key** plus an
 *     asserted user, so only the first-party OAuth proxy can drive them;
 *   - `/token` authenticates the client by id and secret;
 *   - `/userinfo` takes a bearer access token;
 *   - `/revoke` and `/introspect` take a resource server's 876 API key.
 */
export function createOAuthRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'OAuth',
    prefix: '/oauth',
    security: 'public',
    resolveGuards,
  })

  api.get({
    path: '/.well-known/openid-configuration',
    operationId: 'oauth-get_openid_configuration',
    summary: 'OIDC discovery document',
    description: docs.OPENID_CONFIG_DESCRIPTION,
    responses: { 200: { description: 'Discovery document.' } },
    handler: controller.openidConfiguration,
  })

  api.get({
    path: '/.well-known/jwks.json',
    operationId: 'oauth-get_jwks',
    summary: 'JSON Web Key Set',
    description: docs.JWKS_DESCRIPTION,
    responses: { 200: { description: 'The JSON Web Key Set.' } },
    handler: controller.jwks,
  })

  api.get({
    path: '/authorize',
    operationId: 'oauth-get_authorize',
    summary: 'Authorization endpoint',
    description: docs.AUTHORIZE_DESCRIPTION,
    request: { query: authorizeQuerySchema },
    responses: {
      200: {
        description: 'Authorized, or consent is required.',
        schema: authorizeResponseSchema,
      },
      400: { description: 'The request or the redirect URI is invalid.' },
      401: { description: 'A signed-in 876 account is required.' },
    },
    handler: controller.authorize,
  })

  api.post({
    path: '/token',
    operationId: 'oauth-post_token',
    summary: 'Token endpoint',
    description: docs.TOKEN_DESCRIPTION,
    request: { body: tokenBodySchema },
    responses: {
      200: { description: 'Tokens issued.', schema: tokenResponseSchema },
      400: { description: 'The grant could not be redeemed.' },
      401: { description: 'The client could not be authenticated.' },
    },
    handler: controller.token,
  })

  api.get({
    path: '/userinfo',
    operationId: 'oauth-get_userinfo',
    summary: 'UserInfo endpoint',
    description: docs.USERINFO_DESCRIPTION,
    responses: {
      200: {
        description: 'The claims released by the token.',
        schema: userinfoResponseSchema,
      },
      401: { description: 'The access token is invalid or expired.' },
    },
    handler: controller.userinfo,
  })

  api.get({
    path: '/end-session',
    operationId: 'oauth-get_end_session',
    summary: 'RP-Initiated Logout',
    request: { query: endSessionQuerySchema },
    responses: { 302: { description: 'Redirect to the post-logout target.' } },
    handler: controller.endSession,
  })

  api.post({
    path: '/revoke',
    operationId: 'oauth-post_revoke',
    summary: 'Revoke token',
    description: docs.REVOKE_DESCRIPTION,
    request: { body: tokenActionBodySchema },
    responses: {
      200: {
        description: 'The token was revoked.',
        schema: revokeResponseSchema,
      },
      401: { description: 'The API key is invalid.' },
    },
    handler: controller.revoke,
  })

  api.post({
    path: '/introspect',
    operationId: 'oauth-post_introspect',
    summary: 'Token introspection',
    description: docs.INTROSPECT_DESCRIPTION,
    request: { body: tokenActionBodySchema },
    responses: {
      200: {
        description: 'The token state.',
        schema: introspectResponseSchema,
      },
      401: { description: 'The API key is invalid.' },
    },
    handler: controller.introspect,
  })

  api.get({
    path: '/consent',
    operationId: 'oauth-get_consent',
    summary: 'Consent screen data',
    description: docs.CONSENT_GET_DESCRIPTION,
    request: { query: authorizeQuerySchema },
    responses: {
      200: {
        description: 'What the consent screen needs to render.',
        schema: consentDetailsSchema,
      },
      401: { description: 'A signed-in 876 account is required.' },
    },
    handler: controller.consent,
  })

  api.post({
    path: '/consent/approve',
    operationId: 'oauth-post_consent_approve',
    summary: 'Approve consent',
    description: docs.CONSENT_APPROVE_DESCRIPTION,
    request: { body: consentBodySchema, query: consentQuerySchema },
    responses: {
      200: {
        description: 'Consent recorded and a code issued.',
        schema: authorizeResponseSchema,
      },
      401: { description: 'A signed-in 876 account is required.' },
    },
    handler: controller.consentApprove,
  })

  api.post({
    path: '/consent/deny',
    operationId: 'oauth-post_consent_deny',
    summary: 'Deny consent',
    description: docs.CONSENT_DENY_DESCRIPTION,
    request: { body: consentBodySchema },
    responses: {
      200: {
        description: 'A redirect carrying access_denied.',
        schema: authorizeResponseSchema,
      },
      400: { description: 'The redirect URI is not registered.' },
    },
    handler: controller.consentDeny,
  })

  return api.router
}
