import type {
  Branding as CoreBranding,
  BrandingUpdate,
} from '@876/core/branding'

/** The branding fields are owned by the shared Core contract. */
export type Branding = CoreBranding & {
  object: 'branding'
  updatedAt: number | null
}

export type BrandingUpdateParams = BrandingUpdate
