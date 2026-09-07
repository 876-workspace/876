export interface PriceResolutionRequest {
  priceId: string
  quantity: number
}

export interface ResolvedPrice {
  priceId: string
  itemId: string | null
  unitName: string | null
  description: string | null
  currency: string
  unitAmount: bigint
  lineAmount: bigint
}

export interface ResolvedPriceList {
  id: string
  name: string
}

export type PricingResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; status?: number; code?: string }
