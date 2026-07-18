/**
 * `@876/core/platform` — the narrow, server-only platform bootstrap client
 * for first-party product apps (Couriers, Billing, Enterprise, the consumer
 * app, future apps).
 *
 * Product apps need a handful of privileged platform reads and provisioning
 * calls — session routing memberships, feature evaluation, app-subscription
 * entitlements — whose backing endpoints are internal-key tier. The full
 * `@876/admin` package is the Console-only surface and must never be a
 * dependency of a product app; this module carries ONLY the bootstrap subset
 * so the admin surface (platform-wide user/org CRUD, search, moderation)
 * literally does not exist in product-app bundles.
 *
 * The `server-only` guard plus the `x-internal-key` credential make this
 * strictly server-side. Apps wrap it in a small `src/lib/auth/` module that
 * supplies their own app API key and per-request id; nothing here may be
 * imported from browser code.
 *
 * @module @876/core/platform
 */
import 'server-only'

import {
  CLIENT_INVALID_RESPONSE_ERROR,
  NETWORK_OFFLINE_ERROR,
  resolve876ApiBaseUrl,
  sendClientRequest,
} from '../client'
import type { ClientHttpMethod } from '../client'
import type { LookupResult } from '../client/lookup'
import type {
  ProvisioningManifestRevision,
  ProvisioningProperty,
  ProvisioningRun,
  ProvisioningTargetType,
} from '../types/provisioning'

/** A user row as returned by the internal-key user lookups. */
export type PlatformUser = {
  id: string
  workos_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar: string | null
  role: string | null
  permissions: string[] | null
  status: string | null
  banned: boolean | null
}

/** A routing membership row (`/auth/routing/memberships`). */
export type PlatformRoutingMembership = {
  id: string
  role: string
  status: string
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
  }
}

/** A membership row (`/memberships`). */
export type PlatformMembership = {
  object: 'membership'
  id: string
  organization_id: string
  user_id: string
  role: string
  role_id: string | null
  status: string
  created_at: number
  updated_at: number
}

/** An organization row, narrowed to the fields product apps consume. */
export type PlatformOrganization = {
  object: 'organization'
  id: string
  name: string | null
  slug: string
  status: string
  logo_url: string | null
  timezone: string | null
  language: string | null
  country_code: string | null
  currency_code: string | null
  created_at: number
  updated_at: number
}

/** An org→app subscription row, narrowed to the fields product apps consume. */
export type PlatformSubscription = {
  object: 'subscription'
  id: string
  organization_id: string
  app_id: string
  app_slug: string | null
  app_name: string | null
  status: string
  items: Array<{
    id: string
    price_id: string
    product_id: string | null
    quantity: number
  }>
  created_at: number
  updated_at: number
}

/** An organization invite token. */
export type PlatformInviteToken = {
  object: 'invite_token'
  id: string
  organization_id: string
  email: string
  role: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: number
  source_app_id: string | null
  created_at: number
}

/** A feature evaluation row (`/features/evaluate`). */
export type PlatformFeature = {
  id: string
  slug: string
  enabled: boolean
}

export type PlatformProvisioningProperty = ProvisioningProperty
export type PlatformProvisioningRevision = ProvisioningManifestRevision
export type PlatformProvisioningRun = ProvisioningRun

/** The kind of resource targeted by an onboarding catalog. */
export type PlatformOnboardingTargetType = 'organization' | 'application'

/** A selectable onboarding field option. */
export type PlatformOnboardingOption = {
  value: string
  label: string
}

/** A condition that makes an onboarding field required. */
export type PlatformOnboardingCondition = {
  field_key: string
  equals: unknown
}

/** A field in an onboarding catalog. */
export type PlatformOnboardingField = {
  key: string
  label: string
  description: string | null
  field_type: string
  required: boolean
  sensitive: boolean
  placeholder: string | null
  pattern: string | null
  min_items: number | null
  required_when: PlatformOnboardingCondition | null
  options: PlatformOnboardingOption[]
  item_fields: PlatformOnboardingField[]
}

/** A section in an onboarding catalog. */
export type PlatformOnboardingSection = {
  key: string
  title: string
  description: string
  position: number
  fields: PlatformOnboardingField[]
}

/** The onboarding catalog for an organization or application target. */
export type PlatformOnboardingCatalog = {
  object: 'onboarding_catalog'
  target_type: PlatformOnboardingTargetType
  target_key: string
  country_code: string
  schema_version: 1
  catalog_revision: number
  sections: PlatformOnboardingSection[]
}

/** An organization's saved onboarding answers and lifecycle state. */
export type PlatformOnboardingSession = {
  object: 'onboarding_session'
  id: string
  organization_id: string
  target_type: PlatformOnboardingTargetType
  target_key: string
  country_code: string
  schema_version: 1
  catalog_revision: number
  status: 'draft' | 'submitted' | 'completed' | 'needs_update'
  answers: Record<string, unknown>
  submitted_at: number | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

/** A single onboarding validation failure. */
export type PlatformOnboardingValidationIssue = {
  path: string
  code: string
  message: string
}

/** The result of validating onboarding answers. */
export type PlatformOnboardingValidation = {
  object: 'onboarding_validation'
  valid: boolean
  issues: PlatformOnboardingValidationIssue[]
}

/** A user feature grant row (`/users/{id}/features`). */
export type PlatformUserFeature = {
  id: string
  slug: string
  status: string
}

/** The standard list envelope returned by platform list endpoints. */
export type PlatformList<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
  total_count: number | null
}

/**
 * Options for {@link create876PlatformClient}.
 *
 * @property baseUrl - API base URL; defaults to `API_URL` (then the public
 *   URL fallbacks) from the environment.
 * @property internalKey - The `x-internal-key` secret; defaults to
 *   `API_INTERNAL_KEY`. Server-only — never expose to the browser.
 * @property apiKey - The app's `876_app_secret_*` key sent alongside the
 *   internal key (the API's global api-key gate rejects internal-key-only
 *   requests).
 * @property requestId - Optional per-request correlation id forwarded as
 *   `x-request-id`.
 */
export type Platform876ClientOptions = {
  baseUrl?: string
  internalKey?: string
  apiKey?: string
  requestId?: string
  fetch?: typeof fetch
}

type PlatformRuntime = {
  baseUrl: string
  internalKey?: string
  apiKey?: string
  requestId?: string
  fetch: typeof fetch
}

type PlatformRequestInit = {
  method: ClientHttpMethod
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: Record<string, unknown>
}

const platformBaseUrlEnvKeys = [
  'API_URL',
  'NEXT_PUBLIC_876_API_URL',
  'NEXT_PUBLIC_API_URL',
] as const

/**
 * Creates the server-only platform bootstrap client.
 *
 * @example
 * const platform = create876PlatformClient({ apiKey: process.env.API_876_KEY })
 * const memberships = await platform.auth.getRoutingMemberships({ userId })
 */
export function create876PlatformClient(
  options: Platform876ClientOptions = {}
) {
  const runtime: PlatformRuntime = {
    baseUrl: resolve876ApiBaseUrl(
      options.baseUrl,
      platformBaseUrlEnvKeys
    ).replace(/\/$/, ''),
    internalKey: options.internalKey ?? process.env.API_INTERNAL_KEY,
    apiKey: options.apiKey ?? process.env.API_876_KEY,
    requestId: options.requestId,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  }

  return {
    provisioning: {
      /** Retrieves the immutable recipe currently used for new tenants. */
      retrievePublished(targetType: ProvisioningTargetType, targetKey: string) {
        return platformRequest<PlatformProvisioningRevision>(runtime, {
          method: 'GET',
          path: `/provisioning/manifests/${encodeURIComponent(targetType)}/${encodeURIComponent(targetKey)}/published`,
        })
      },

      /** Claims queued direct-application work for this app's materializer. */
      claimApplication(organizationId: string, appId: string) {
        return platformRequest<PlatformProvisioningRun>(runtime, {
          method: 'POST',
          path: '/provisioning/runs/application/claim',
          body: { organization_id: organizationId, app_id: appId },
        })
      },

      /** Reports the atomic result of an application-owned materializer. */
      completeApplication(
        runId: string,
        result: { status: 'succeeded' } | { status: 'failed'; error: string }
      ) {
        return platformRequest<PlatformProvisioningRun>(runtime, {
          method: 'POST',
          path: `/provisioning/runs/${encodeURIComponent(runId)}/complete`,
          body: result,
        })
      },
    },

    auth: {
      /** Resolves a user's org memberships for session routing. */
      getRoutingMemberships(params: {
        userId: string
        orgSlug?: string
        status?: string
      }) {
        return platformRequest<{ data: PlatformRoutingMembership[] }>(runtime, {
          method: 'GET',
          path: '/auth/routing/memberships',
          query: {
            userId: params.userId,
            orgSlug: params.orgSlug,
            status: params.status,
          },
        })
      },
    },

    features: {
      /** Evaluates the enabled feature flags for a user/org/app scope. */
      evaluate(params: {
        userId?: string
        organizationId?: string
        appId?: string
        appSlug?: string
        includeGlobal?: boolean
      }) {
        return platformRequest<PlatformList<PlatformFeature>>(runtime, {
          method: 'GET',
          path: '/features/evaluate',
          query: {
            userId: params.userId,
            organizationId: params.organizationId,
            appId: params.appId,
            appSlug: params.appSlug,
            includeGlobal: params.includeGlobal,
          },
        })
      },
    },

    memberships: {
      /** Lists memberships, filterable by organization and user. */
      list(params: {
        limit?: number
        starting_after?: string
        ending_before?: string
        organization_id?: string
        user_id?: string
      }) {
        return platformRequest<PlatformList<PlatformMembership>>(runtime, {
          method: 'GET',
          path: '/memberships',
          query: params,
        })
      },
    },

    onboarding: {
      /** Retrieves an onboarding catalog for an organization or app target. */
      retrieveCatalog(
        targetType: PlatformOnboardingTargetType,
        targetKey: string,
        countryCode = 'JM'
      ) {
        return platformRequest<PlatformOnboardingCatalog>(runtime, {
          method: 'GET',
          path: `/onboarding/catalog/${onboardingTargetPath(targetType, targetKey)}`,
          query: { country_code: countryCode },
        })
      },

      /** Retrieves an organization's onboarding session. */
      retrieve(
        orgId: string,
        targetType: PlatformOnboardingTargetType,
        targetKey: string,
        countryCode = 'JM'
      ) {
        return platformRequest<PlatformOnboardingSession>(runtime, {
          method: 'GET',
          path: `/onboarding/organizations/${encodeURIComponent(orgId)}/${onboardingTargetPath(targetType, targetKey)}`,
          query: { country_code: countryCode },
        })
      },

      /** Replaces an organization's saved onboarding answers. */
      replaceAnswers(
        orgId: string,
        targetType: PlatformOnboardingTargetType,
        targetKey: string,
        params: { countryCode: string; answers: Record<string, unknown> }
      ) {
        return platformRequest<PlatformOnboardingSession>(runtime, {
          method: 'PUT',
          path: `/onboarding/organizations/${encodeURIComponent(orgId)}/${onboardingTargetPath(targetType, targetKey)}`,
          body: {
            country_code: params.countryCode,
            answers: params.answers,
          },
        })
      },

      /** Validates onboarding answers without saving them. */
      validate(
        targetType: PlatformOnboardingTargetType,
        targetKey: string,
        params: { countryCode: string; answers: Record<string, unknown> }
      ) {
        return platformRequest<PlatformOnboardingValidation>(runtime, {
          method: 'POST',
          path: `/onboarding/catalog/${onboardingTargetPath(targetType, targetKey)}/validate`,
          body: {
            country_code: params.countryCode,
            answers: params.answers,
          },
        })
      },

      /** Submits an organization's onboarding session. */
      submit(
        orgId: string,
        targetType: PlatformOnboardingTargetType,
        targetKey: string,
        countryCode = 'JM'
      ) {
        return platformRequest<PlatformOnboardingSession>(runtime, {
          method: 'POST',
          path: `/onboarding/organizations/${encodeURIComponent(orgId)}/${onboardingTargetPath(targetType, targetKey)}/submit`,
          query: { country_code: countryCode },
        })
      },
    },

    orgs: {
      /** Creates an organization owned by an existing user (org bootstrap). */
      create(params: { ownerUserId: string; name: string; slug?: string }) {
        return platformRequest<PlatformOrganization>(runtime, {
          method: 'POST',
          path: '/organizations/bootstrap',
          body: {
            owner_user_id: params.ownerUserId,
            name: params.name,
            slug: params.slug,
          },
        })
      },

      /** Retrieves an organization by id. */
      retrieve(orgId: string) {
        return platformRequest<PlatformOrganization>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}`,
        })
      },

      invites: {
        /** Creates an invite token for an organization. */
        create(
          orgId: string,
          params: { email: string; role?: string; sourceAppSlug?: string }
        ) {
          return platformRequest<PlatformInviteToken>(runtime, {
            method: 'POST',
            path: `/organizations/${orgId}/invites`,
            body: {
              email: params.email,
              role: params.role,
              source_app_slug: params.sourceAppSlug,
            },
          })
        },

        /** Lists invite tokens for an organization. */
        list(orgId: string) {
          return platformRequest<PlatformList<PlatformInviteToken>>(runtime, {
            method: 'GET',
            path: `/organizations/${orgId}/invites`,
          })
        },
      },

      subscriptions: {
        /** Lists an organization's app subscriptions. */
        list(orgId: string) {
          return platformRequest<PlatformSubscription[]>(runtime, {
            method: 'GET',
            path: `/organizations/${orgId}/apps`,
          })
        },

        /** Retrieves an org's subscription to an app by the app's slug. */
        retrieveBySlug(orgId: string, appSlug: string) {
          return platformRequest<PlatformSubscription>(runtime, {
            method: 'GET',
            path: `/organizations/${orgId}/apps/by-slug/${appSlug}`,
          })
        },

        /** Provisions (activates) an org's subscription to an app. */
        provision(
          orgId: string,
          params: { appId?: string; appSlug?: string; priceId?: string }
        ) {
          return platformRequest<PlatformSubscription>(runtime, {
            method: 'POST',
            path: `/organizations/${orgId}/apps`,
            body: {
              app_id: params.appId,
              app_slug: params.appSlug,
              price_id: params.priceId,
            },
          })
        },
      },
    },

    users: {
      /** Retrieves a user by 876 user id. */
      retrieve(userId: string) {
        return platformRequest<PlatformUser>(runtime, {
          method: 'GET',
          path: `/users/${userId}`,
        })
      },

      /** Retrieves a user by WorkOS user id. */
      retrieveByWorkosId(workosUserId: string) {
        return platformRequest<PlatformUser>(runtime, {
          method: 'GET',
          path: `/users/by-workos-id/${workosUserId}`,
        })
      },

      /** Lists a user's direct feature grants. */
      listFeatures(userId: string) {
        return platformRequest<PlatformList<PlatformUserFeature>>(runtime, {
          method: 'GET',
          path: `/users/${userId}/features`,
        })
      },
    },
  }
}

/** The narrow platform client returned by {@link create876PlatformClient}. */
export type Platform876Client = ReturnType<typeof create876PlatformClient>

function onboardingTargetPath(
  targetType: PlatformOnboardingTargetType,
  targetKey: string
) {
  return `${encodeURIComponent(targetType)}/${encodeURIComponent(targetKey)}`
}

async function platformRequest<T>(
  runtime: PlatformRuntime,
  init: PlatformRequestInit
): Promise<LookupResult<T>> {
  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method: init.method,
      path: init.path,
      query: init.query,
      body: init.body,
      headers: platformHeaders(runtime),
    }
  )

  if (result.networkError) {
    return {
      data: null,
      error: NETWORK_OFFLINE_ERROR,
    }
  }

  // The API's envelope middleware wraps every JSON response in
  // `{ data, error }`; unwrap it so `data` is the resource itself.
  if (result.ok) {
    const payload = result.payload
    if (isEnvelopePayload(payload)) {
      if (payload.error === null)
        return { data: payload.data as T, error: null }
      return { data: null, error: normalizePlatformError(payload.error) }
    }

    return { data: null, error: CLIENT_INVALID_RESPONSE_ERROR }
  }

  return { data: null, error: normalizePlatformError(result.payload) }
}

function isEnvelopePayload(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Object.prototype.hasOwnProperty.call(payload, 'data') &&
    Object.prototype.hasOwnProperty.call(payload, 'error') &&
    Object.keys(payload).every((key) => key === 'data' || key === 'error')
  )
}

function normalizePlatformError(errorPayload: unknown): {
  code: string
  message: string
} {
  const payload = isEnvelopePayload(errorPayload)
    ? errorPayload.error
    : errorPayload
  const record =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : null
  const error =
    record && typeof record.error === 'object' && record.error !== null
      ? (record.error as Record<string, unknown>)
      : record

  return {
    code: typeof error?.code === 'string' ? error.code : 'platform/error',
    message:
      typeof error?.message === 'string' ? error.message : 'An error occurred.',
  }
}

function platformHeaders(runtime: PlatformRuntime): Record<string, string> {
  const requestHeaders: Record<string, string> = {}

  if (runtime.internalKey)
    requestHeaders['x-internal-key'] = runtime.internalKey
  if (runtime.apiKey) requestHeaders['X-876-API-Key'] = runtime.apiKey
  if (runtime.requestId) requestHeaders['x-request-id'] = runtime.requestId

  return requestHeaders
}
