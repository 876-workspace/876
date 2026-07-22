import type {
  AddonAssociationEvent,
  AddonAssociationFrequency,
  AddonAssociationType,
  IntervalUnit,
  ItemType,
  PriceType,
  PricingModel,
} from './enums'
import type { MinorAmount } from './common'

/**
 * Parameters for creating a product.
 */
export interface ProductCreateParams {
  /**
   * Unique slug for the product within the tenant.
   */
  slug: string

  /**
   * The product's display name.
   */
  name: string

  /**
   * An arbitrary description of the product. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * Whether the product is a good or a service. One of `GOOD` or `SERVICE`.
   */
  type?: ItemType

  /**
   * ID of the source app that created the product, if any.
   */
  sourceAppId?: string | null

  /**
   * Notification recipients for product events.
   */
  notificationRecipients?: string | null

  /**
   * Redirect URL used after checkout, if any.
   */
  redirectUrl?: string | null
}

/**
 * Parameters for updating a product.
 */
export interface ProductUpdateParams {
  /**
   * The product's display name.
   */
  name?: string

  /**
   * An arbitrary description of the product. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * Whether the product is a good or a service. One of `GOOD` or `SERVICE`.
   */
  type?: ItemType

  /**
   * Notification recipients for product events.
   */
  notificationRecipients?: string | null

  /**
   * Redirect URL used after checkout, if any.
   */
  redirectUrl?: string | null

  /**
   * ID of the fallback plan used when this product is no longer available.
   */
  fallbackPlanId?: string | null

  /**
   * Whether the product is active for new purchases.
   */
  isActive?: boolean
}

/**
 * Parameters for creating a plan.
 */
export interface PlanCreateParams {
  /**
   * ID of the product this plan belongs to.
   */
  productId: string

  /**
   * Unique code for the plan within the product.
   */
  code: string

  /**
   * The plan's display name.
   */
  name: string

  /**
   * An arbitrary description of the plan. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * URL of an image representing the plan.
   */
  imageUrl?: string | null

  /**
   * Unit name shown next to quantities (for example, `seat`).
   */
  unitName?: string | null

  /**
   * Tax code used for tax calculation.
   */
  taxCode?: string | null

  /**
   * External entitlement reference for the plan.
   */
  entitlementReferenceId?: string | null

  /**
   * Billing period unit. One of `DAY`, `WEEK`, `MONTH`, or `YEAR`.
   */
  intervalUnit: IntervalUnit

  /**
   * Number of intervals between billings.
   */
  intervalCount?: number

  /**
   * Number of billing cycles before the plan ends, if finite.
   */
  billingCycleCount?: number | null

  /**
   * Number of free trial days.
   */
  trialDays?: number

  /**
   * One-time setup fee in the smallest currency unit.
   */
  setupFeeAmount?: MinorAmount | null

  /**
   * Three-letter ISO currency code for the setup fee.
   */
  setupFeeCurrency?: string | null

  /**
   * Whether the plan is taxable.
   */
  isTaxable?: boolean

  /**
   * Whether the plan is free.
   */
  isFree?: boolean

  /**
   * Whether the plan is shown in checkout.
   */
  showInCheckout?: boolean
}

/**
 * Parameters for updating a plan.
 */
export interface PlanUpdateParams {
  /**
   * The plan's display name.
   */
  name?: string

  /**
   * An arbitrary description of the plan. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * URL of an image representing the plan.
   */
  imageUrl?: string | null

  /**
   * Unit name shown next to quantities (for example, `seat`).
   */
  unitName?: string | null

  /**
   * Tax code used for tax calculation.
   */
  taxCode?: string | null

  /**
   * Number of free trial days.
   */
  trialDays?: number

  /**
   * One-time setup fee in the smallest currency unit.
   */
  setupFeeAmount?: MinorAmount | null

  /**
   * Three-letter ISO currency code for the setup fee.
   */
  setupFeeCurrency?: string | null

  /**
   * Whether the plan is taxable.
   */
  isTaxable?: boolean

  /**
   * Whether the plan is free.
   */
  isFree?: boolean

  /**
   * Whether the plan is shown in checkout.
   */
  showInCheckout?: boolean

  /**
   * Whether the plan is active for new purchases.
   */
  isActive?: boolean
}

/**
 * A pricing tier used by volume or package prices.
 */
export interface PriceTierCreateParams {
  /**
   * First unit included in this tier.
   */
  fromUnit: number

  /**
   * Last unit included in this tier. Null means open-ended.
   */
  toUnit?: number | null

  /**
   * Per-unit amount in the smallest currency unit.
   */
  unitAmount?: MinorAmount | null

  /**
   * Flat amount for the entire tier in the smallest currency unit.
   */
  flatAmount?: MinorAmount | null
}

/**
 * Parameters for creating a price.
 */
export interface PriceCreateParams {
  /**
   * ID of the catalog item this price belongs to, if any.
   */
  itemId?: string | null

  /**
   * ID of the plan this price belongs to, if any.
   */
  planId?: string | null

  /**
   * ID of the addon this price belongs to, if any.
   */
  addonId?: string | null

  /**
   * A brief description of the price, hidden from customers.
   */
  nickname?: string | null

  /**
   * External entitlement reference for the price.
   */
  entitlementReferenceId?: string | null

  /**
   * Three-letter ISO currency code for the price.
   */
  currency: string

  /**
   * Unit amount in the smallest currency unit.
   */
  unitAmount?: MinorAmount | null

  /**
   * Pricing formula. One of `FLAT`, `PER_UNIT`, `VOLUME`, `TIERED`, or `PACKAGE`.
   */
  pricingModel?: PricingModel

  /**
   * Whether the price is one-time or recurring. One of `ONE_TIME` or `RECURRING`.
   */
  priceType?: PriceType

  /**
   * Billing period unit for recurring prices.
   */
  intervalUnit?: IntervalUnit | null

  /**
   * Number of intervals between billings for recurring prices.
   */
  intervalCount?: number | null

  /**
   * Unit name shown next to quantities.
   */
  unitName?: string | null

  /**
   * Package size when `pricingModel` is `PACKAGE`.
   */
  packageSize?: number | null

  /**
   * Whether the price is taxable.
   */
  isTaxable?: boolean

  /**
   * Pricing tiers when `pricingModel` is `VOLUME` or `TIERED`.
   */
  tiers?: PriceTierCreateParams[]
}

/**
 * Parameters for updating a price.
 */
export interface PriceUpdateParams {
  /**
   * A brief description of the price, hidden from customers.
   */
  nickname?: string | null

  /**
   * Whether the price is active for new purchases.
   */
  isActive?: boolean
}

/**
 * Parameters for upserting a plan-addon association.
 */
export interface AddonAssociationUpsertParams {
  /**
   * ID of the plan this association attaches to.
   */
  planId: string

  /**
   * Strength of the association. One of `OPTIONAL`, `RECOMMENDED`, or `MANDATORY`.
   */
  associationType?: AddonAssociationType

  /**
   * Lifecycle events that surface this association.
   */
  events?: AddonAssociationEvent[]

  /**
   * How often the association is applied. One of `EVERY_OCCURRENCE` or `FIRST_OCCURRENCE`.
   */
  frequency?: AddonAssociationFrequency

  /**
   * Whether the association is active.
   */
  isActive?: boolean
}

/**
 * Result of a batch plan-addon association update.
 */
export interface AddonAssociationBatchResult {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'plan_addon_association_batch'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Number of associations updated.
   */
  updated: number
}

/**
 * Parameters for creating an addon price inline.
 */
export interface AddonPriceCreateParams {
  /**
   * Three-letter ISO currency code for the price.
   */
  currency: string

  /**
   * Unit amount in the smallest currency unit.
   */
  unitAmount?: MinorAmount | null

  /**
   * Pricing formula. One of `FLAT`, `PER_UNIT`, `VOLUME`, `TIERED`, or `PACKAGE`.
   */
  pricingModel?: PricingModel

  /**
   * Unit name shown next to quantities.
   */
  unitName?: string | null

  /**
   * Package size when `pricingModel` is `PACKAGE`.
   */
  packageSize?: number | null

  /**
   * Pricing tiers when the model requires them.
   */
  tiers?: PriceTierCreateParams[]
}

/**
 * Parameters for creating an addon.
 */
export interface AddonCreateParams {
  /**
   * ID of the product this addon belongs to.
   */
  productId: string

  /**
   * Unique code for the addon within the product.
   */
  code: string

  /**
   * The addon's display name.
   */
  name: string

  /**
   * An arbitrary description of the addon. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * URL of an image representing the addon.
   */
  imageUrl?: string | null

  /**
   * Whether the addon is a good or a service. One of `GOOD` or `SERVICE`.
   */
  type?: ItemType

  /**
   * Whether the addon is one-time or recurring. One of `ONE_TIME` or `RECURRING`.
   */
  priceType?: PriceType

  /**
   * Billing period unit for recurring addons.
   */
  intervalUnit?: IntervalUnit | null

  /**
   * Number of intervals between billings for recurring addons.
   */
  intervalCount?: number | null

  /**
   * Unit name shown next to quantities.
   */
  unitName?: string | null

  /**
   * Tax code used for tax calculation.
   */
  taxCode?: string | null

  /**
   * Whether the addon is taxable.
   */
  isTaxable?: boolean

  /**
   * Whether the addon is shown in checkout.
   */
  showInCheckout?: boolean

  /**
   * Whether customers can manage this addon in the portal.
   */
  allowPortalManagement?: boolean

  /**
   * Inline price created with the addon, if any.
   */
  price?: AddonPriceCreateParams | null

  /**
   * Plan associations created with the addon.
   */
  associations?: AddonAssociationUpsertParams[]
}

/**
 * Parameters for updating an addon.
 */
export interface AddonUpdateParams {
  /**
   * The addon's display name.
   */
  name?: string

  /**
   * An arbitrary description of the addon. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * URL of an image representing the addon.
   */
  imageUrl?: string | null

  /**
   * Unit name shown next to quantities.
   */
  unitName?: string | null

  /**
   * Tax code used for tax calculation.
   */
  taxCode?: string | null

  /**
   * Whether the addon is taxable.
   */
  isTaxable?: boolean

  /**
   * Whether the addon is shown in checkout.
   */
  showInCheckout?: boolean

  /**
   * Whether customers can manage this addon in the portal.
   */
  allowPortalManagement?: boolean

  /**
   * Whether the addon is active for new purchases.
   */
  isActive?: boolean
}

/**
 * A price list entry used when creating a custom price list.
 */
export interface PriceListEntryCreateParams {
  /**
   * ID of the price this entry overrides.
   */
  priceId: string

  /**
   * Overridden unit amount in the smallest currency unit.
   */
  unitAmount?: MinorAmount | null

  /**
   * Overridden tiers for volume or tiered prices.
   */
  tiers?: Array<{
    fromUnit: number
    toUnit?: number | null
    unitAmount: MinorAmount
  }>
}

/**
 * Parameters for creating a price list.
 */
export interface PriceListCreateParams {
  /**
   * The price list's display name.
   */
  name: string

  /**
   * An arbitrary description of the price list. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * How the price list adjusts prices. One of `PERCENTAGE` or `CUSTOM`.
   */
  mode: 'PERCENTAGE' | 'CUSTOM'

  /**
   * Direction of a percentage adjustment. One of `MARKUP` or `MARKDOWN`.
   */
  direction?: 'MARKUP' | 'MARKDOWN' | null

  /**
   * Percentage used when `mode` is `PERCENTAGE`.
   */
  percentage?: number | null

  /**
   * Three-letter ISO currency code for custom entries.
   */
  currency?: string | null

  /**
   * Rounding strategy. One of `NONE`, `NEAREST`, `UP`, or `DOWN`.
   */
  rounding?: 'NONE' | 'NEAREST' | 'UP' | 'DOWN'

  /**
   * Rounding precision in decimal places.
   */
  roundingPrecision?: number

  /**
   * Custom per-price entries when `mode` is `CUSTOM`.
   */
  entries?: PriceListEntryCreateParams[]
}

/**
 * Parameters for updating a price list.
 */
export interface PriceListUpdateParams {
  /**
   * The price list's display name.
   */
  name?: string

  /**
   * An arbitrary description of the price list. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * Whether the price list is active for new assignments.
   */
  isActive?: boolean
}

/**
 * Parameters for cloning a catalog resource.
 */
export interface CatalogCloneParams {
  /**
   * Code for the cloned resource.
   */
  code: string

  /**
   * Display name for the cloned resource.
   */
  name: string
}

/**
 * A catalog resource returned by create or retrieve operations.
 */
export interface CatalogResource extends Record<string, unknown> {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'product' | 'plan' | 'price' | 'addon' | 'price_list'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A minimal catalog resource returned after creation.
 */
export interface CatalogCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object:
    | 'product'
    | 'plan'
    | 'price'
    | 'addon'
    | 'price_list'
    | 'plan_addon_association'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted catalog resource tombstone.
 */
export interface CatalogDeleted extends CatalogCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}

/**
 * A price resolved through a price list, if any.
 */
export interface ResolvedPrice {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'resolved_price'

  /**
   * Three-letter ISO currency code for the resolved amount.
   */
  currency: string

  /**
   * Resolved amount as a decimal string.
   */
  amount: string

  /**
   * ID of the price list that produced the amount, if any.
   */
  price_list_id: string | null
}
