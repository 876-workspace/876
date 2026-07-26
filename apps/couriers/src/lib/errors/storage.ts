import type { ErrorDef } from '@876/core'
import { HttpStatus } from '@876/core'

export const STORAGE_ERRORS = {
  'storage/unauthorized': {
    message: 'You must sign in before uploading a file.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'storage/forbidden': {
    message: 'You do not have permission to upload this file.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'storage/route-not-found': {
    message: 'This upload route is not available.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'storage/file-not-found': {
    message: 'The requested file was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'storage/upload-not-found': {
    message: 'The upload session was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'storage/invalid-owner': {
    message: 'This file cannot be attached to that owner.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'storage/invalid-request': {
    message: 'The upload request is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'storage/upload-incomplete': {
    message: 'The file upload has not finished.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'storage/upload-expired': {
    message: 'The upload session has expired. Please try again.',
    httpStatus: HttpStatus.GONE,
  },
  'storage/file-too-large': {
    message: 'The file is larger than the allowed size.',
    httpStatus: HttpStatus.PAYLOAD_TOO_LARGE,
  },
  'storage/mime-not-allowed': {
    message: 'This file type is not allowed for this upload.',
    httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  },
  'storage/upload-verification-failed': {
    message: 'The uploaded file could not be verified. Please try again.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'storage/provider-error': {
    message: 'File storage is temporarily unavailable. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'storage/not-configured': {
    message: 'File storage is not configured.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
} as const satisfies Record<string, ErrorDef>

export type StorageErrorCode = keyof typeof STORAGE_ERRORS
