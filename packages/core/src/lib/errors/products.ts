import type { ProductErrorCode } from '../../types/products-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Product-related error codes. Keep this registry sorted by code.
 */
export const PRODUCT_ERRORS = {
  'product/duplicate-slug': {
    message: 'A product with this slug already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'product/no-updates': {
    message: 'No updates were provided.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'product/not-found': {
    message: 'Product not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<ProductErrorCode, ErrorDef>
