import type { Error, List, Result } from '../../types'

/**
 * Options shared by the Billing integration client.
 */
export interface IntegrationClientOptions {
  /**
   * Billing API origin. Defaults from `BILLING_API_URL` (or legacy `BILLING_URL`).
   */
  baseUrl?: string

  /**
   * Platform-admin credential for Console. Server-side only.
   */
  internalKey?: string

  /**
   * Calling product app's 876 API key. Server-side only.
   */
  apiKey?: string

  /**
   * Short-lived 876 OAuth access token for a delegated integration.
   */
  accessToken?: string

  /**
   * Optional fetch implementation for tests or custom runtimes.
   */
  fetch?: typeof fetch

  /**
   * Optional request ID propagated across service boundaries.
   */
  requestId?: string
}

/**
 * Options for create requests that support idempotent retries.
 */
export interface IntegrationCreateOptions {
  /**
   * Stable retry key, unique per product app and resource type.
   */
  idempotencyKey: string
}

/**
 * Source metadata that links a Billing resource to the product app that created it.
 */
export interface BillingSource {
  /**
   * ID of the product app that owns this source reference.
   */
  appId: string

  /**
   * External reference in the product app, if any.
   */
  externalReference: string | null
}

/**
 * A client-safe integration error. Alias of the shared Billing error shape.
 */
export type IntegrationError = Error

/**
 * Result envelope returned by every integration client method.
 */
export type IntegrationResult<T> = Result<T>

export type { List }
