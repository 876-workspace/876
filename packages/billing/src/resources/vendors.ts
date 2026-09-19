import { Request } from '../request'
import type { Runtime } from '../runtime'
import { VendorDeletedSchema, VendorListSchema, VendorSchema } from '../schemas'
import type {
  List,
  RequestOptions,
  Vendor,
  VendorCreateParams,
  VendorDeleted,
  VendorListParams,
  VendorUpdateParams,
} from '../types'

/** `$876.billing.vendors.*` — tenant-scoped vendor operations. */
export function createVendorsResource(runtime: Runtime) {
  return {
    /** Lists vendors in the active Billing workspace. */
    list(params: VendorListParams = {}, options?: RequestOptions) {
      return Request<List<Vendor>>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/vendors',
          query: { status: params.status },
          signal: options?.signal,
        },
        VendorListSchema
      )
    },
    /** Creates a vendor in the active Billing workspace. */
    create(params: VendorCreateParams, options?: RequestOptions) {
      return Request<Vendor>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/vendors',
          body: params,
          signal: options?.signal,
        },
        VendorSchema
      )
    },
    /** Retrieves a single vendor by ID. */
    retrieve(vendorId: string, options?: RequestOptions) {
      return Request<Vendor>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/vendors/${encodeURIComponent(vendorId)}`,
          signal: options?.signal,
        },
        VendorSchema
      )
    },
    /** Updates an existing vendor. */
    update(
      vendorId: string,
      params: VendorUpdateParams,
      options?: RequestOptions
    ) {
      return Request<Vendor>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/vendors/${encodeURIComponent(vendorId)}`,
          body: params,
          signal: options?.signal,
        },
        VendorSchema
      )
    },
    /** Deletes a vendor by ID. */
    delete(vendorId: string, options?: RequestOptions) {
      return Request<VendorDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/vendors/${encodeURIComponent(vendorId)}`,
          signal: options?.signal,
        },
        VendorDeletedSchema
      )
    },
  }
}
