import { buildClientQuery } from '@876/core/client'

import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  sdk876ProductListSchema,
  sdk876ProductSchema,
} from '../types/products.ts'
import type { ProductListResult, ProductResult } from '../types/products.ts'

export function createProductsResource(runtime: SdkRuntime) {
  return {
    /** Lists products (with their prices). */
    list(
      params?: {
        appId?: string
        status?: 'active' | 'archived'
        limit?: number
        starting_after?: string
        ending_before?: string
      },
      requestOptions?: RequestOptions
    ): Promise<ProductListResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/products${buildClientQuery(params ?? {})}`,
        undefined,
        sdk876ProductListSchema,
        requestOptions
      )
    },

    /** Retrieves a product. */
    retrieve(
      productId: string,
      requestOptions?: RequestOptions
    ): Promise<ProductResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/products/${productId}`,
        undefined,
        sdk876ProductSchema,
        requestOptions
      )
    },
  }
}
