import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './mobile-numbers.controller'
import * as docs from './mobile-numbers.docs'
import {
  approveVerificationBodySchema,
  createMobileNumberBodySchema,
  createVerificationBodySchema,
  mobileNumberDeletedSchema,
  mobileNumberIdParamsSchema,
  mobileNumberSchema,
  mobileNumberVerificationSchema,
  updateMobileNumberBodySchema,
  verificationApproveParamsSchema,
} from './mobile-numbers.schemas'

export function createMobileNumbersRouter(
  resolveGuards: GuardResolver
): Router {
  const api = createApiRouter({
    tag: 'Mobile Numbers',
    prefix: '/users/me/mobile-numbers',
    security: 'session',
    resolveGuards,
  })

  api.post({
    path: '',
    operationId: 'mobile-numbers-create_mobile_number',
    summary: docs.CREATE_MOBILE_NUMBER_SUMMARY,
    description: docs.CREATE_MOBILE_NUMBER_DESCRIPTION,
    request: { body: createMobileNumberBodySchema },
    responses: {
      201: {
        description: 'Mobile number created.',
        schema: mobileNumberSchema,
      },
    },
    handler: controller.createMobileNumber,
  })

  api.get({
    path: '',
    operationId: 'mobile-numbers-list_mobile_numbers',
    summary: docs.LIST_MOBILE_NUMBERS_SUMMARY,
    description: docs.LIST_MOBILE_NUMBERS_DESCRIPTION,
    responses: {
      200: {
        description: 'Mobile numbers returned.',
        schema: listObjectSchema(mobileNumberSchema),
      },
    },
    handler: controller.listMobileNumbers,
  })

  // Sub-resource routes before '/:mobile_number_id' so Express does not match
  // the literal segments as ids.

  api.post({
    path: '/:mobile_number_id/verifications/:verification_id/approve',
    operationId: 'mobile-numbers-approve_verification',
    summary: docs.APPROVE_VERIFICATION_SUMMARY,
    description: docs.APPROVE_VERIFICATION_DESCRIPTION,
    request: {
      params: verificationApproveParamsSchema,
      body: approveVerificationBodySchema,
    },
    responses: {
      200: {
        description: 'Verification approved.',
        schema: mobileNumberVerificationSchema,
      },
    },
    handler: controller.approveVerification,
  })

  api.post({
    path: '/:mobile_number_id/verifications',
    operationId: 'mobile-numbers-create_verification',
    summary: docs.CREATE_VERIFICATION_SUMMARY,
    description: docs.CREATE_VERIFICATION_DESCRIPTION,
    request: {
      params: mobileNumberIdParamsSchema,
      body: createVerificationBodySchema,
    },
    responses: {
      201: {
        description: 'Verification sent.',
        schema: mobileNumberVerificationSchema,
      },
    },
    handler: controller.createVerification,
  })

  api.post({
    path: '/:mobile_number_id/make-primary',
    operationId: 'mobile-numbers-make_primary',
    summary: docs.MAKE_PRIMARY_SUMMARY,
    description: docs.MAKE_PRIMARY_DESCRIPTION,
    request: { params: mobileNumberIdParamsSchema },
    responses: {
      200: {
        description: 'Primary number updated.',
        schema: mobileNumberSchema,
      },
    },
    handler: controller.makePrimary,
  })

  api.get({
    path: '/:mobile_number_id',
    operationId: 'mobile-numbers-retrieve_mobile_number',
    summary: docs.RETRIEVE_MOBILE_NUMBER_SUMMARY,
    description: docs.RETRIEVE_MOBILE_NUMBER_DESCRIPTION,
    request: { params: mobileNumberIdParamsSchema },
    responses: {
      200: {
        description: 'Mobile number returned.',
        schema: mobileNumberSchema,
      },
      404: { description: 'Mobile number not found.' },
    },
    handler: controller.retrieveMobileNumber,
  })

  api.patch({
    path: '/:mobile_number_id',
    operationId: 'mobile-numbers-update_mobile_number',
    summary: docs.UPDATE_MOBILE_NUMBER_SUMMARY,
    description: docs.UPDATE_MOBILE_NUMBER_DESCRIPTION,
    request: {
      params: mobileNumberIdParamsSchema,
      body: updateMobileNumberBodySchema,
    },
    responses: {
      200: {
        description: 'Mobile number updated.',
        schema: mobileNumberSchema,
      },
      404: { description: 'Mobile number not found.' },
    },
    handler: controller.updateMobileNumber,
  })

  api.delete({
    path: '/:mobile_number_id',
    operationId: 'mobile-numbers-delete_mobile_number',
    summary: docs.DELETE_MOBILE_NUMBER_SUMMARY,
    description: docs.DELETE_MOBILE_NUMBER_DESCRIPTION,
    request: { params: mobileNumberIdParamsSchema },
    responses: {
      200: {
        description: 'Mobile number deleted.',
        schema: mobileNumberDeletedSchema,
      },
      404: { description: 'Mobile number not found.' },
    },
    handler: controller.deleteMobileNumber,
  })

  return api.router
}
