import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import * as controller from './customers.controller'
import {
  createCustomerBodySchema,
  customerParamsSchema,
  customerSchema,
  listCustomersQuerySchema,
  mailboxCreateBodySchema,
  mailboxSchema,
  mailboxUpdateBodySchema,
  tenantParamsSchema,
  type CustomerParams,
} from './customers.schemas'
const mailboxParamsSchema = customerParamsSchema.extend({
  mailboxId: z.string().min(1),
})
export function createCustomersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Customers',
    prefix: '/v1/tenants/:tenantId/customers',
    resolveGuards,
  })
  api.get({
    path: '',
    security: 'admin',
    operationId: 'customers-list',
    summary: 'List courier customer profiles',
    request: { params: tenantParamsSchema, query: listCustomersQuerySchema },
    responses: {
      200: {
        description: 'Customer profiles returned.',
        schema: successEnvelopeSchema(listObjectSchema(customerSchema)),
      },
    },
    handler: controller.listCustomers,
  })
  api.post({
    path: '',
    security: 'admin',
    operationId: 'customers-create',
    summary: 'Create a courier customer profile',
    request: { params: tenantParamsSchema, body: createCustomerBodySchema },
    responses: {
      201: {
        description: 'Customer profile created.',
        schema: successEnvelopeSchema(customerSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
      409: { description: 'Customer exists.', schema: errorEnvelopeSchema },
    },
    handler: controller.createCustomer,
  })
  api.get({
    path: '/:id',
    security: 'admin',
    operationId: 'customers-retrieve',
    summary: 'Retrieve a courier customer profile',
    request: { params: customerParamsSchema },
    responses: {
      200: {
        description: 'Customer profile returned.',
        schema: successEnvelopeSchema(customerSchema),
      },
      404: { description: 'Customer not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrieveCustomer,
  })
  api.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'customers-update',
    summary: 'Update a courier customer profile',
    request: {
      params: customerParamsSchema,
      body: z.strictObject({
        branch_id: z.string().min(1).nullable().optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
        is_commercial: z.boolean().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Customer profile updated.',
        schema: successEnvelopeSchema(customerSchema),
      },
      404: { description: 'Customer not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.updateCustomer,
  })
  api.get({
    path: '/:id/mailboxes',
    security: 'admin',
    operationId: 'mailboxes-list',
    summary: 'List customer mailboxes',
    request: { params: customerParamsSchema },
    responses: {
      200: {
        description: 'Mailboxes returned.',
        schema: successEnvelopeSchema(listObjectSchema(mailboxSchema)),
      },
    },
    handler: controller.listMailboxes,
  })
  api.post({
    path: '/:id/mailboxes',
    security: 'admin',
    operationId: 'mailboxes-create',
    summary: 'Assign a customer mailbox',
    request: { params: customerParamsSchema, body: mailboxCreateBodySchema },
    responses: {
      201: {
        description: 'Mailbox created.',
        schema: successEnvelopeSchema(mailboxSchema),
      },
      404: { description: 'Customer not found.', schema: errorEnvelopeSchema },
      409: { description: 'Mailbox exists.', schema: errorEnvelopeSchema },
    },
    handler: controller.createMailbox,
  })
  api.patch({
    path: '/:id/mailboxes/:mailboxId',
    security: 'admin',
    operationId: 'mailboxes-update',
    summary: 'Update a customer mailbox',
    request: { params: mailboxParamsSchema, body: mailboxUpdateBodySchema },
    responses: {
      200: {
        description: 'Mailbox updated.',
        schema: successEnvelopeSchema(mailboxSchema),
      },
      404: { description: 'Mailbox not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.updateMailbox,
  })
  return api.router
}
