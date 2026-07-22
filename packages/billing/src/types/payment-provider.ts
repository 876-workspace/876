import type { JsonValue } from './common'

/**
 * This object represents a payment provider available to tenants.
 */
export interface PaymentProvider {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment_provider'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Stable key for the provider (for example, `stripe`).
   */
  key: string

  /**
   * The provider's display name.
   */
  name: string

  /**
   * URL of the provider's logo, if any.
   */
  logoUrl: string | null

  /**
   * Adapter identifier used by the Billing service.
   */
  adapter: string

  /**
   * Whether the provider is active for new connections.
   */
  isActive: boolean
}

/**
 * Parameters for creating a payment provider connection.
 */
export interface PaymentProviderConnectionCreateParams {
  /**
   * ID of the payment provider to connect.
   */
  providerId: string

  /**
   * Display name for the connection.
   */
  name: string

  /**
   * Environment for the connection. One of `SANDBOX` or `LIVE`.
   */
  environment?: 'SANDBOX' | 'LIVE'

  /**
   * Merchant account ID at the provider, if applicable.
   */
  merchantAccountId?: string | null

  /**
   * External reference to stored credentials. Secrets must not be sent inline.
   */
  credentialsReference?: string | null

  /**
   * External reference to a stored webhook secret.
   */
  webhookSecretReference?: string | null

  /**
   * Provider-specific settings as JSON-safe values.
   */
  settings?: Record<string, JsonValue> | null
}

/**
 * Parameters for updating a payment provider connection.
 */
export interface PaymentProviderConnectionUpdateParams {
  /**
   * Display name for the connection.
   */
  name?: string

  /**
   * Status of the connection. One of `PENDING`, `ACTIVE`, `DISABLED`, or `ERROR`.
   */
  status?: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ERROR'

  /**
   * Merchant account ID at the provider, if applicable.
   */
  merchantAccountId?: string | null

  /**
   * External reference to stored credentials. Secrets must not be sent inline.
   */
  credentialsReference?: string | null

  /**
   * External reference to a stored webhook secret.
   */
  webhookSecretReference?: string | null

  /**
   * Provider-specific settings as JSON-safe values.
   */
  settings?: Record<string, JsonValue> | null
}

/**
 * This object represents a tenant connection to a payment provider.
 */
export interface PaymentProviderConnection {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment_provider_connection'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the payment provider.
   */
  providerId: string

  /**
   * Display name for the connection.
   */
  name: string

  /**
   * Environment for the connection. One of `SANDBOX` or `LIVE`.
   */
  environment: 'SANDBOX' | 'LIVE'

  /**
   * Status of the connection. One of `PENDING`, `ACTIVE`, `DISABLED`, or `ERROR`.
   */
  status: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ERROR'

  /**
   * Merchant account ID at the provider, if applicable.
   */
  merchantAccountId: string | null

  /**
   * Time at which the connection was last synced. Measured in seconds since the Unix epoch.
   */
  lastSyncedAt: number | null

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}
