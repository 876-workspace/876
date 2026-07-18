import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  sdk876ConsumerAddressCreateParamsSchema,
  sdk876ConsumerAddressListSchema,
  sdk876ConsumerAddressSchema,
  sdk876ConsumerAddressUpdateParamsSchema,
  sdk876ConsumerContactCreateParamsSchema,
  sdk876ConsumerContactListSchema,
  sdk876ConsumerContactSchema,
  sdk876ConsumerContactUpdateParamsSchema,
  sdk876ConsumerProfileSchema,
  sdk876ConsumerProfileUpdateParamsSchema,
  sdk876DeletedConsumerAddressSchema,
  sdk876DeletedConsumerContactSchema,
} from '../types/users.ts'
import type {
  ConsumerAddressCreateParams,
  ConsumerAddressListResult,
  ConsumerAddressResult,
  ConsumerAddressUpdateParams,
  ConsumerContactCreateParams,
  ConsumerContactListResult,
  ConsumerContactResult,
  ConsumerContactUpdateParams,
  ConsumerProfileResult,
  ConsumerProfileUpdateParams,
  DeletedConsumerAddressResult,
  DeletedConsumerContactResult,
} from '../types/users.ts'
import { validateParams } from '../validation.ts'

/**
 * `$876.users.*` — the current user's own profile, addresses, and contacts
 * (self-scoped `/users/me/*` routes, session/API-key tier). Platform-wide
 * user administration stays in `@876/admin`.
 */
export function createUsersResource(runtime: SdkRuntime) {
  function deleteAddress(
    addressId: string,
    requestOptions?: RequestOptions
  ): Promise<DeletedConsumerAddressResult> {
    return sendAuthRequest(
      runtime,
      'DELETE',
      `/users/me/addresses/${addressId}`,
      undefined,
      sdk876DeletedConsumerAddressSchema,
      requestOptions
    )
  }

  function deleteContact(
    contactId: string,
    requestOptions?: RequestOptions
  ): Promise<DeletedConsumerContactResult> {
    return sendAuthRequest(
      runtime,
      'DELETE',
      `/users/me/contacts/${contactId}`,
      undefined,
      sdk876DeletedConsumerContactSchema,
      requestOptions
    )
  }

  return {
    profile: {
      retrieve(
        requestOptions?: RequestOptions
      ): Promise<ConsumerProfileResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          '/users/me/profile',
          undefined,
          sdk876ConsumerProfileSchema,
          requestOptions
        )
      },

      update(
        params: ConsumerProfileUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<ConsumerProfileResult> {
        const validation = validateParams(
          sdk876ConsumerProfileUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          '/users/me/profile',
          validation.data,
          sdk876ConsumerProfileSchema,
          requestOptions
        )
      },
    },

    addresses: {
      list(
        requestOptions?: RequestOptions
      ): Promise<ConsumerAddressListResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          '/users/me/addresses',
          undefined,
          sdk876ConsumerAddressListSchema,
          requestOptions
        )
      },

      create(
        params: ConsumerAddressCreateParams,
        requestOptions?: RequestOptions
      ): Promise<ConsumerAddressResult> {
        const validation = validateParams(
          sdk876ConsumerAddressCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          '/users/me/addresses',
          validation.data,
          sdk876ConsumerAddressSchema,
          requestOptions
        )
      },

      retrieve(
        addressId: string,
        requestOptions?: RequestOptions
      ): Promise<ConsumerAddressResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/users/me/addresses/${addressId}`,
          undefined,
          sdk876ConsumerAddressSchema,
          requestOptions
        )
      },

      update(
        addressId: string,
        params: ConsumerAddressUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<ConsumerAddressResult> {
        const validation = validateParams(
          sdk876ConsumerAddressUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/users/me/addresses/${addressId}`,
          validation.data,
          sdk876ConsumerAddressSchema,
          requestOptions
        )
      },

      /** Deletes one of the current user's addresses. */
      delete: deleteAddress,

      /** @deprecated Use `delete()` — it matches the standard verb vocabulary. */
      del: deleteAddress,
    },

    contacts: {
      list(
        requestOptions?: RequestOptions
      ): Promise<ConsumerContactListResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          '/users/me/contacts',
          undefined,
          sdk876ConsumerContactListSchema,
          requestOptions
        )
      },

      create(
        params: ConsumerContactCreateParams,
        requestOptions?: RequestOptions
      ): Promise<ConsumerContactResult> {
        const validation = validateParams(
          sdk876ConsumerContactCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          '/users/me/contacts',
          validation.data,
          sdk876ConsumerContactSchema,
          requestOptions
        )
      },

      retrieve(
        contactId: string,
        requestOptions?: RequestOptions
      ): Promise<ConsumerContactResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/users/me/contacts/${contactId}`,
          undefined,
          sdk876ConsumerContactSchema,
          requestOptions
        )
      },

      update(
        contactId: string,
        params: ConsumerContactUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<ConsumerContactResult> {
        const validation = validateParams(
          sdk876ConsumerContactUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/users/me/contacts/${contactId}`,
          validation.data,
          sdk876ConsumerContactSchema,
          requestOptions
        )
      },

      /** Deletes one of the current user's contacts. */
      delete: deleteContact,

      /** @deprecated Use `delete()` — it matches the standard verb vocabulary. */
      del: deleteContact,
    },
  }
}
