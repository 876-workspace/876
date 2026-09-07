import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { customersController as controller } from './customers.controller'
import { customersDocs as docs } from './customers.docs'
import {
  createdInvoiceSchema,
  customerAccountSchema,
  contactCreateBodySchema,
  contactListSchema,
  contactParamsSchema,
  contactSchema,
  contactUpdateBodySchema,
  customerCreateBodySchema,
  customerEnsureBodySchema,
  customerImportBodySchema,
  customerImportSchema,
  customerListQuerySchema,
  customerListSchema,
  customerParamsSchema,
  customerSchema,
  customerUpdateBodySchema,
  deletedCustomerSchema,
  deletedContactSchema,
  integrationCustomerListQuerySchema,
  integrationCustomerCreateBodySchema,
  linkCustomerBodySchema,
  openingBalanceBodySchema,
  organizationCustomerParamsSchema,
  organizationParamsSchema,
} from './customers.schemas'

const errorResponse = {
  description: 'Client Error',
  schema: errorEnvelopeSchema,
}
const legacyErrors = { 422: errorResponse }
const clientErrors = { '4XX': errorResponse }

export function createCustomersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Customers', resolveGuards })
  api.get({
    path: '/customers',
    ...docs.list,
    operationId: 'billing-billing_get_customers',
    security: { kind: 'tenant', permission: 'customers:read' },
    request: { query: customerListQuerySchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(customerListSchema),
      },
      ...legacyErrors,
    },
    handler: controller.list,
  })
  api.post({
    path: '/customers',
    ...docs.create,
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { body: customerCreateBodySchema },
    responses: {
      201: {
        description: 'customer created',
        schema: successEnvelopeSchema(
          z.strictObject({ object: z.literal('customer'), id: z.string() })
        ),
      },
      ...clientErrors,
    },
    handler: controller.create,
  })
  api.post({
    path: '/customers/import',
    ...docs.importRows,
    operationId: 'billing-billing_post_customers_import',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { body: customerImportBodySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(customerImportSchema),
      },
      ...legacyErrors,
    },
    handler: controller.importRows,
  })
  api.get({
    path: '/customers/:customerId/contacts',
    ...docs.listContacts,
    operationId: 'billing-billing_get_customers_customerId_contacts',
    security: { kind: 'tenant', permission: 'customers:read' },
    request: { params: customerParamsSchema },
    responses: {
      200: {
        description: 'contact list',
        schema: successEnvelopeSchema(contactListSchema),
      },
      ...legacyErrors,
    },
    handler: controller.listContacts,
  })
  api.post({
    path: '/customers/:customerId/contacts',
    ...docs.createContact,
    operationId: 'billing-billing_post_customers_customerId_contacts',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { params: customerParamsSchema, body: contactCreateBodySchema },
    responses: {
      201: {
        description: 'contact created',
        schema: successEnvelopeSchema(
          z.strictObject({ object: z.literal('contact'), id: z.string() })
        ),
      },
      ...clientErrors,
    },
    handler: controller.createContact,
  })
  api.get({
    path: '/customers/:customerId/contacts/:contactId',
    ...docs.retrieveContact,
    operationId: 'billing-billing_get_customers_customerId_contacts_contactId',
    security: { kind: 'tenant', permission: 'customers:read' },
    request: { params: contactParamsSchema },
    responses: {
      200: {
        description: 'contact returned',
        schema: successEnvelopeSchema(contactSchema),
      },
      ...legacyErrors,
    },
    handler: controller.retrieveContact,
  })
  api.patch({
    path: '/customers/:customerId/contacts/:contactId',
    ...docs.updateContact,
    operationId:
      'billing-billing_patch_customers_customerId_contacts_contactId',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { params: contactParamsSchema, body: contactUpdateBodySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'contact updated',
        schema: successEnvelopeSchema(contactSchema),
      },
      ...legacyErrors,
    },
    handler: controller.updateContact,
  })
  api.delete({
    path: '/customers/:customerId/contacts/:contactId',
    ...docs.deleteContact,
    operationId:
      'billing-billing_delete_customers_customerId_contacts_contactId',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { params: contactParamsSchema },
    responses: {
      200: {
        description: 'contact deleted',
        schema: successEnvelopeSchema(deletedContactSchema),
      },
      ...legacyErrors,
    },
    handler: controller.deleteContact,
  })
  api.get({
    path: '/customers/:customerId',
    ...docs.retrieve,
    operationId: 'billing-billing_get_customers_customerId',
    security: { kind: 'tenant', permission: 'customers:read' },
    request: { params: customerParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(customerSchema),
      },
      ...legacyErrors,
    },
    handler: controller.retrieve,
  })
  api.patch({
    path: '/customers/:customerId',
    ...docs.update,
    operationId: 'billing-billing_patch_customers_customerId',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { params: customerParamsSchema, body: customerUpdateBodySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(customerSchema),
      },
      ...legacyErrors,
    },
    handler: controller.update,
  })
  api.delete({
    path: '/customers/:customerId',
    ...docs.del,
    operationId: 'billing-billing_delete_customers_customerId',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { params: customerParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(deletedCustomerSchema),
      },
      ...legacyErrors,
    },
    handler: controller.del,
  })
  api.get({
    path: '/customers/:customerId/account',
    ...docs.account,
    security: { kind: 'tenant', permission: 'customers:read' },
    request: { params: customerParamsSchema },
    responses: {
      200: {
        description: 'customer account',
        schema: successEnvelopeSchema(customerAccountSchema),
      },
      ...clientErrors,
    },
    handler: controller.account,
  })
  api.post({
    path: '/customers/:customerId/link',
    ...docs.link,
    operationId: 'billing-billing_post_customers_customerId_link',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { params: customerParamsSchema, body: linkCustomerBodySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(customerSchema),
      },
      ...legacyErrors,
    },
    handler: controller.link,
  })
  api.post({
    path: '/customers/:customerId/unlink',
    ...docs.unlink,
    operationId: 'billing-billing_post_customers_customerId_unlink',
    security: { kind: 'tenant', permission: 'customers:write' },
    request: {
      params: customerParamsSchema,
      body: z.strictObject({}).default({}),
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(customerSchema),
      },
      ...legacyErrors,
    },
    handler: controller.unlink,
  })
  api.post({
    path: '/customers/:customerId/opening-balance',
    ...docs.openingBalance,
    security: { kind: 'tenant', permission: 'customers:write' },
    request: { params: customerParamsSchema, body: openingBalanceBodySchema },
    responses: {
      201: {
        description: 'invoice created',
        schema: successEnvelopeSchema(createdInvoiceSchema),
      },
      ...clientErrors,
    },
    handler: controller.openingBalance,
  })

  api.post({
    path: '/admin/customers/ensure',
    ...docs.ensure,
    security: { kind: 'admin' },
    request: { body: customerEnsureBodySchema },
    responses: {
      200: {
        description: 'customer ensured',
        schema: successEnvelopeSchema(
          z.strictObject({ object: z.literal('customer'), id: z.string() })
        ),
      },
      ...clientErrors,
    },
    handler: controller.ensure,
  })

  const integrationBase =
    '/integrations/organizations/:organizationId/customers'
  api.get({
    path: integrationBase,
    summary: 'List organization Billing customers',
    security: { kind: 'integration', scope: 'billing.customers.read' },
    request: {
      params: organizationParamsSchema,
      query: integrationCustomerListQuerySchema,
    },
    responses: {
      200: {
        description: 'customer list',
        schema: successEnvelopeSchema(customerListSchema),
      },
      ...clientErrors,
    },
    handler: controller.integrationList,
  })
  api.post({
    path: integrationBase,
    summary: 'Create an organization Billing customer',
    security: { kind: 'integration', scope: 'billing.customers.write' },
    request: {
      params: organizationParamsSchema,
      body: integrationCustomerCreateBodySchema,
    },
    responses: {
      200: {
        description: 'customer returned',
        schema: successEnvelopeSchema(customerSchema),
      },
      201: {
        description: 'customer created',
        schema: successEnvelopeSchema(
          z.strictObject({ object: z.literal('customer'), id: z.string() })
        ),
      },
      ...clientErrors,
    },
    handler: controller.integrationCreate,
  })
  api.get({
    path: `${integrationBase}/:customerId`,
    summary: 'Retrieve an organization Billing customer',
    security: { kind: 'integration', scope: 'billing.customers.read' },
    request: { params: organizationCustomerParamsSchema },
    responses: {
      200: {
        description: 'customer returned',
        schema: successEnvelopeSchema(customerSchema),
      },
      ...clientErrors,
    },
    handler: controller.integrationRetrieve,
  })
  api.patch({
    path: `${integrationBase}/:customerId`,
    summary: 'Update an organization Billing customer',
    security: { kind: 'integration', scope: 'billing.customers.write' },
    request: {
      params: organizationCustomerParamsSchema,
      body: customerUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'customer updated',
        schema: successEnvelopeSchema(customerSchema),
      },
      ...clientErrors,
    },
    handler: controller.integrationUpdate,
  })
  api.delete({
    path: `${integrationBase}/:customerId`,
    summary: 'Delete an organization Billing customer',
    security: { kind: 'integration', scope: 'billing.customers.write' },
    request: { params: organizationCustomerParamsSchema },
    responses: {
      200: {
        description: 'customer deleted',
        schema: successEnvelopeSchema(deletedCustomerSchema),
      },
      ...clientErrors,
    },
    handler: controller.integrationDelete,
  })
  return api.router
}
