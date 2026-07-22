/**
 * Parameters for creating a salesperson.
 */
export interface SalespersonCreateParams {
  /**
   * The salesperson's display name.
   */
  name: string

  /**
   * The salesperson's email address.
   */
  email?: string | null

  /**
   * An external reference you can use to match this salesperson in another system.
   */
  externalReference?: string | null
}

/**
 * This object represents a salesperson that can be assigned to customers and invoices.
 */
export interface Salesperson {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'salesperson'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The salesperson's display name.
   */
  name: string

  /**
   * The salesperson's email address.
   */
  email: string | null

  /**
   * An external reference you can use to match this salesperson in another system.
   */
  externalReference: string | null

  /**
   * Whether the salesperson is active for new assignments.
   */
  isActive: boolean

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}
