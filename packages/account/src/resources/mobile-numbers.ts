import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  deletedMobileNumberSchema,
  mobileNumberCreateParamsSchema,
  mobileNumberListSchema,
  mobileNumberSchema,
  mobileNumberUpdateParamsSchema,
} from '../types/mobile-numbers.ts'
import type {
  DeletedMobileNumberResult,
  MobileNumberCreateParams,
  MobileNumberListResult,
  MobileNumberResult,
  MobileNumberUpdateParams,
} from '../types/mobile-numbers.ts'
import { validateParams } from '../validation.ts'

export const MOBILE_NUMBERS_ENDPOINT = '/users/me/mobile-numbers'

/** `$876.mobileNumbers.*` — mobile numbers owned by the current user. */
export function createMobileNumbersResource(runtime: SdkRuntime) {
  return {
    create(
      params: MobileNumberCreateParams,
      options?: RequestOptions
    ): Promise<MobileNumberResult> {
      const validation = validateParams(mobileNumberCreateParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        MOBILE_NUMBERS_ENDPOINT,
        validation.data,
        mobileNumberSchema,
        options
      )
    },

    retrieve(
      mobileNumberId: string,
      options?: RequestOptions
    ): Promise<MobileNumberResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        `${MOBILE_NUMBERS_ENDPOINT}/${mobileNumberId}`,
        undefined,
        mobileNumberSchema,
        options
      )
    },

    update(
      mobileNumberId: string,
      params: MobileNumberUpdateParams,
      options?: RequestOptions
    ): Promise<MobileNumberResult> {
      const validation = validateParams(mobileNumberUpdateParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'PATCH',
        `${MOBILE_NUMBERS_ENDPOINT}/${mobileNumberId}`,
        validation.data,
        mobileNumberSchema,
        options
      )
    },

    /**
     * Promotes a verified mobile number to the account's primary number.
     *
     * @param mobileNumberId - The mobile number to promote.
     * @param options - Optional per-request configuration.
     * @returns A Promise resolving to the updated `MobileNumber`.
     *
     * @see /users/me/mobile-numbers/{id}/make-primary
     */
    makePrimary(
      mobileNumberId: string,
      options?: RequestOptions
    ): Promise<MobileNumberResult> {
      return sendAuthRequest(
        runtime,
        'POST',
        `${MOBILE_NUMBERS_ENDPOINT}/${mobileNumberId}/make-primary`,
        undefined,
        mobileNumberSchema,
        options
      )
    },

    delete(
      mobileNumberId: string,
      options?: RequestOptions
    ): Promise<DeletedMobileNumberResult> {
      return sendAuthRequest(
        runtime,
        'DELETE',
        `${MOBILE_NUMBERS_ENDPOINT}/${mobileNumberId}`,
        undefined,
        deletedMobileNumberSchema,
        options
      )
    },

    list(options?: RequestOptions): Promise<MobileNumberListResult> {
      return sendAuthRequest(
        runtime,
        'GET',
        MOBILE_NUMBERS_ENDPOINT,
        undefined,
        mobileNumberListSchema,
        options
      )
    },
  }
}
