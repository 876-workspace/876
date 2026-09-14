import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const ONBOARDING_ERRORS = {
  'onboarding/invalid-organization': {
    message: 'Invalid onboarding organization.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'onboarding/invalid-answers': {
    message: 'Invalid onboarding answers.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'onboarding/invalid-invites': {
    message: 'Provide valid invite emails.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'onboarding/verification-failed': {
    message: 'The workspace could not be verified. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'onboarding/answers-unavailable': {
    message: 'Setup answers could not be loaded. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'onboarding/incomplete': {
    message: 'Complete the setup step first.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'onboarding/platform-name-required': {
    message: 'Provide your platform name in the setup step.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'onboarding/activation-failed': {
    message: 'The workspace could not be activated. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'onboarding/provisioning-unavailable': {
    message: 'Workspace defaults could not be loaded. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'onboarding/provisioning-failed': {
    message: 'Workspace defaults could not be applied. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
} as const satisfies Record<string, ErrorDef>
