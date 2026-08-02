import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  mobileNumberVerificationApproveParamsSchema,
  mobileNumberVerificationCreateParamsSchema,
  mobileNumberVerificationSchema,
} from '../types/mobile-numbers.ts'
import type {
  MobileNumberVerificationApproveParams,
  MobileNumberVerificationCreateParams,
  MobileNumberVerificationResult,
} from '../types/mobile-numbers.ts'
import { validateParams } from '../validation.ts'

import { MOBILE_NUMBERS_ENDPOINT } from './mobile-numbers.ts'

/** `$876.mobileNumberVerifications.*` — provider-owned checks for the user's numbers. */
export function createMobileNumberVerificationsResource(runtime: SdkRuntime) {
  return {
    create(mobileNumberId: string, params: MobileNumberVerificationCreateParams, options?: RequestOptions): Promise<MobileNumberVerificationResult> {
      const validation = validateParams(mobileNumberVerificationCreateParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(runtime, 'POST', `${MOBILE_NUMBERS_ENDPOINT}/${mobileNumberId}/verifications`, validation.data, mobileNumberVerificationSchema, options)
    },

    approve(mobileNumberId: string, verificationId: string, params: MobileNumberVerificationApproveParams, options?: RequestOptions): Promise<MobileNumberVerificationResult> {
      const validation = validateParams(mobileNumberVerificationApproveParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(runtime, 'POST', `${MOBILE_NUMBERS_ENDPOINT}/${mobileNumberId}/verifications/${verificationId}/approve`, validation.data, mobileNumberVerificationSchema, options)
    },
  }
}
