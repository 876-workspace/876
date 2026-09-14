import { listObject } from '@/http/envelope'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  deletedObjectSchema,
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import { getPrincipal } from '@/http/auth'
import { errors } from '@/http/errors'
import { resolveCurrentTenant } from './me.middleware'

import * as customersService from '@/modules/customers'
import {
  customerSchema,
  customerEnrollmentBodySchema,
  customerEnrollmentSchema,
  listCustomersQuerySchema,
  createCustomerBodySchema,
  updateCustomerBodySchema,
  deleteCustomerBodySchema,
  mailboxCreateBodySchema,
  mailboxUpdateBodySchema,
  mailboxSchema,
} from '@/modules/customers'
import * as packagesService from '@/modules/packages'
import {
  packageSchema,
  listPackagesQuerySchema,
  createPackageBodySchema,
  updatePackageBodySchema,
} from '@/modules/packages'
import * as branchesService from '@/modules/branches'
import {
  branchSchema,
  createBranchBodySchema,
  updateBranchBodySchema,
  listBranchesQuerySchema,
} from '@/modules/branches'
import * as warehousesService from '@/modules/warehouses'
import {
  warehouseSchema,
  createWarehouseBodySchema,
  updateWarehouseBodySchema,
} from '@/modules/warehouses'
import * as teamService from '@/modules/team'
import {
  roleSchema,
  teamMemberSchema,
  roleBodySchema,
  rolePatchBodySchema,
  memberBodySchema,
  memberPatchBodySchema,
  memberListQuerySchema,
} from '@/modules/team'
import * as settingsService from '@/modules/settings'
import {
  moduleKeySchema,
  moduleStateSchema,
  modulePreferencesSchema,
  modulePreferencesUpdateBodySchema,
  toggleBodySchema,
} from '@/modules/settings'
import * as addressesService from '@/modules/addresses'
import {
  addressSchema,
  addressCreateBodySchema,
  addressUpdateBodySchema,
  listAddressesQuerySchema,
} from '@/modules/addresses'
import * as mailboxesService from '@/modules/mailboxes'
import {
  mailboxSchema as tenantMailboxSchema,
  listMailboxesQuerySchema,
} from '@/modules/mailboxes'
import * as tenantsService from '@/modules/tenants'
import { tenantSchema } from '@/modules/tenants'
import { idParamsSchema, type IdParams } from '@/modules/team'

/**
 * Application-context Couriers routes. The tenant is resolved from the
 * authenticated caller's org (never from the browser), so normal app call
 * sites read `$876.<resource>.<verb>(...)` without a tenantId.
 */
export function createMeRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Me',
    prefix: '/v1/me',
    resolveGuards,
  })

  // ---- tenant ----
  api.get({
    path: '/tenant',
    security: 'session',
    operationId: 'me-tenant-retrieve',
    summary: 'Retrieve the caller’s own tenant',
    request: {},
    responses: {
      200: {
        description: 'Tenant returned.',
        schema: successEnvelopeSchema(tenantSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
    },
    handler: async (req, res) => {
      const orgId = getPrincipal(req).orgId
      if (!orgId) throw errors.noSession()
      res.status(200).json(await tenantsService.retrieveTenantByOrgId(orgId))
    },
  })

  // ---- packages ----
  api.get({
    path: '/packages',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-packages-list',
    summary: 'List the caller’s own packages',
    request: { query: listPackagesQuerySchema },
    responses: {
      200: {
        description: 'Packages returned.',
        schema: successEnvelopeSchema(listObjectSchema(packageSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const result = await packagesService.listPackages(
        tenant.id,
        req.valid.query as never
      )
      res.status(200).json(
        listObject({
          data: result.data,
          hasMore: result.hasMore,
          url: `/v1/me/packages`,
        })
      )
    },
  })

  api.get({
    path: '/packages/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-packages-retrieve',
    summary: 'Retrieve one of the caller’s own packages',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Package returned.',
        schema: successEnvelopeSchema(packageSchema),
      },
      404: { description: 'Package not found.', schema: errorEnvelopeSchema },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res.status(200).json(await packagesService.retrievePackage(tenant.id, id))
    },
  })

  api.post({
    path: '/packages',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-packages-create',
    summary: 'Create a package in the caller’s own tenant',
    request: { body: createPackageBodySchema },
    responses: {
      201: {
        description: 'Package created.',
        schema: successEnvelopeSchema(packageSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(
          await packagesService.createPackage(
            tenant.id,
            req.valid.body as never
          )
        )
    },
  })

  api.patch({
    path: '/packages/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-packages-update',
    summary: 'Update one of the caller’s own packages',
    request: { params: idParamsSchema, body: updatePackageBodySchema },
    responses: {
      200: {
        description: 'Package updated.',
        schema: successEnvelopeSchema(packageSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await packagesService.updatePackage(
            tenant.id,
            id,
            req.valid.body as never
          )
        )
    },
  })

  // ---- customers ----
  api.get({
    path: '/customers',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-list',
    summary: 'List the caller’s own customers',
    request: { query: listCustomersQuerySchema },
    responses: {
      200: {
        description: 'Customers returned.',
        schema: successEnvelopeSchema(listObjectSchema(customerSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const result = await customersService.listCustomers(
        tenant.id,
        req.valid.query as never
      )
      res.status(200).json(
        listObject({
          data: result.data,
          hasMore: result.hasMore,
          url: '/v1/me/customers',
        })
      )
    },
  })

  api.post({
    path: '/customers',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-create',
    summary: 'Create a customer in the caller’s own tenant',
    request: { body: createCustomerBodySchema },
    responses: {
      201: {
        description: 'Customer created.',
        schema: successEnvelopeSchema(customerSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(
          await customersService.createCustomer(
            tenant.id,
            req.valid.body as never
          )
        )
    },
  })

  api.post({
    path: '/customers/enrollments',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-enroll',
    summary: 'Enroll an existing Billing customer into the caller’s tenant',
    request: { body: customerEnrollmentBodySchema },
    responses: {
      201: {
        description: 'Customer enrolled.',
        schema: successEnvelopeSchema(customerEnrollmentSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(
          await customersService.enrollCustomer(
            tenant.id,
            req.valid.body as never
          )
        )
    },
  })

  api.get({
    path: '/customers/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-retrieve',
    summary: 'Retrieve one of the caller’s own customers',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Customer returned.',
        schema: successEnvelopeSchema(customerSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(await customersService.retrieveCustomer(tenant.id, id))
    },
  })

  api.patch({
    path: '/customers/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-update',
    summary: 'Update one of the caller’s own customers',
    request: { params: idParamsSchema, body: updateCustomerBodySchema },
    responses: {
      200: {
        description: 'Customer updated.',
        schema: successEnvelopeSchema(customerSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await customersService.updateCustomer(
            tenant.id,
            id,
            req.valid.body as never
          )
        )
    },
  })

  api.delete({
    path: '/customers/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-delete',
    summary: 'Soft-delete one of the caller’s own customers',
    request: { params: idParamsSchema, body: deleteCustomerBodySchema },
    responses: {
      200: {
        description: 'Customer deleted.',
        schema: successEnvelopeSchema(
          deletedObjectSchema('courier_customer_profile')
        ),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await customersService.deleteCustomer(
            tenant.id,
            id,
            req.valid.body as never
          )
        )
    },
  })

  // ---- customer mailboxes ----
  api.get({
    path: '/customers/:id/mailboxes',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-mailboxes-list',
    summary: 'List one of the caller’s own customers’ mailboxes',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Mailboxes returned.',
        schema: successEnvelopeSchema(listObjectSchema(mailboxSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res.status(200).json(
        listObject({
          data: await customersService.listMailboxes(tenant.id, id),
          hasMore: false,
          url: `/v1/me/customers/${id}/mailboxes`,
        })
      )
    },
  })

  api.post({
    path: '/customers/:id/mailboxes',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-mailboxes-create',
    summary: 'Create a mailbox for one of the caller’s own customers',
    request: { params: idParamsSchema, body: mailboxCreateBodySchema },
    responses: {
      201: {
        description: 'Mailbox created.',
        schema: successEnvelopeSchema(mailboxSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(201)
        .json(
          await customersService.createMailbox(
            tenant.id,
            id,
            req.valid.body as never
          )
        )
    },
  })

  api.patch({
    path: '/customers/:id/mailboxes/:mailboxId',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-customers-mailboxes-update',
    summary: 'Update one of the caller’s own customers’ mailboxes',
    request: {
      params: idParamsSchema,
      body: mailboxUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Mailbox updated.',
        schema: successEnvelopeSchema(mailboxSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      const mailboxId = String(req.params.mailboxId)
      res
        .status(200)
        .json(
          await customersService.updateMailbox(
            tenant.id,
            id,
            mailboxId,
            req.valid.body as never
          )
        )
    },
  })

  // ---- branches ----
  api.get({
    path: '/branches',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-branches-list',
    summary: 'List the caller’s own branches',
    request: { query: listBranchesQuerySchema },
    responses: {
      200: {
        description: 'Branches returned.',
        schema: successEnvelopeSchema(listObjectSchema(branchSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const result = await branchesService.listBranches(
        tenant.id,
        req.valid.query as never
      )
      res.status(200).json(
        listObject({
          data: result.branches,
          hasMore: result.hasMore,
          url: '/v1/me/branches',
        })
      )
    },
  })

  api.post({
    path: '/branches',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-branches-create',
    summary: 'Create a branch in the caller’s own tenant',
    request: { body: createBranchBodySchema },
    responses: {
      201: {
        description: 'Branch created.',
        schema: successEnvelopeSchema(branchSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(
          await branchesService.createBranch(tenant.id, req.valid.body as never)
        )
    },
  })

  api.get({
    path: '/branches/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-branches-retrieve',
    summary: 'Retrieve one of the caller’s own branches',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Branch returned.',
        schema: successEnvelopeSchema(branchSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res.status(200).json(await branchesService.retrieveBranch(tenant.id, id))
    },
  })

  api.patch({
    path: '/branches/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-branches-update',
    summary: 'Update one of the caller’s own branches',
    request: { params: idParamsSchema, body: updateBranchBodySchema },
    responses: {
      200: {
        description: 'Branch updated.',
        schema: successEnvelopeSchema(branchSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await branchesService.updateBranch(
            tenant.id,
            id,
            req.valid.body as never
          )
        )
    },
  })

  // ---- warehouses ----
  api.get({
    path: '/warehouses',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-warehouses-list',
    summary: 'List the caller’s own warehouses',
    request: {},
    responses: {
      200: {
        description: 'Warehouses returned.',
        schema: successEnvelopeSchema(listObjectSchema(warehouseSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res.status(200).json(
        listObject({
          data: await warehousesService.listWarehouses(tenant.id),
          hasMore: false,
          url: '/v1/me/warehouses',
        })
      )
    },
  })

  api.post({
    path: '/warehouses',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-warehouses-create',
    summary: 'Create a warehouse in the caller’s own tenant',
    request: { body: createWarehouseBodySchema },
    responses: {
      201: {
        description: 'Warehouse created.',
        schema: successEnvelopeSchema(warehouseSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(
          await warehousesService.createWarehouse(
            tenant.id,
            req.valid.body as never
          )
        )
    },
  })

  api.get({
    path: '/warehouses/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-warehouses-retrieve',
    summary: 'Retrieve one of the caller’s own warehouses',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Warehouse returned.',
        schema: successEnvelopeSchema(warehouseSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(await warehousesService.retrieveWarehouse(tenant.id, id))
    },
  })

  api.patch({
    path: '/warehouses/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-warehouses-update',
    summary: 'Update one of the caller’s own warehouses',
    request: { params: idParamsSchema, body: updateWarehouseBodySchema },
    responses: {
      200: {
        description: 'Warehouse updated.',
        schema: successEnvelopeSchema(warehouseSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await warehousesService.updateWarehouse(
            tenant.id,
            id,
            req.valid.body as never
          )
        )
    },
  })

  // ---- roles ----
  api.get({
    path: '/roles',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-roles-list',
    summary: 'List the caller’s own roles',
    request: {},
    responses: {
      200: {
        description: 'Roles returned.',
        schema: successEnvelopeSchema(listObjectSchema(roleSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res.status(200).json(
        listObject({
          data: await teamService.listRoles(tenant.id),
          hasMore: false,
          url: '/v1/me/roles',
        })
      )
    },
  })

  api.post({
    path: '/roles',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-roles-create',
    summary: 'Create a role in the caller’s own tenant',
    request: { body: roleBodySchema },
    responses: {
      201: {
        description: 'Role created.',
        schema: successEnvelopeSchema(roleSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(await teamService.createRole(tenant.id, req.valid.body as never))
    },
  })

  api.get({
    path: '/roles/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-roles-retrieve',
    summary: 'Retrieve one of the caller’s own roles',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Role returned.',
        schema: successEnvelopeSchema(roleSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res.status(200).json(await teamService.retrieveRole(tenant.id, id))
    },
  })

  api.patch({
    path: '/roles/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-roles-update',
    summary: 'Update one of the caller’s own roles',
    request: { params: idParamsSchema, body: rolePatchBodySchema },
    responses: {
      200: {
        description: 'Role updated.',
        schema: successEnvelopeSchema(roleSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await teamService.updateRole(tenant.id, id, req.valid.body as never)
        )
    },
  })

  api.delete({
    path: '/roles/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-roles-delete',
    summary: 'Delete one of the caller’s own roles',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Role deleted.',
        schema: successEnvelopeSchema(roleSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res.status(200).json(await teamService.deleteRole(tenant.id, id))
    },
  })

  // ---- team ----
  api.get({
    path: '/team',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-team-list',
    summary: 'List the caller’s own team members',
    request: { query: memberListQuerySchema },
    responses: {
      200: {
        description: 'Team members returned.',
        schema: successEnvelopeSchema(listObjectSchema(teamMemberSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { status } = (req.valid.query ?? {}) as {
        status?: 'active' | 'inactive'
      }
      res.status(200).json(
        listObject({
          data: await teamService.listMembers(tenant.id, status),
          hasMore: false,
          url: '/v1/me/team',
        })
      )
    },
  })

  api.post({
    path: '/team',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-team-create',
    summary: 'Add a member to the caller’s own team',
    request: { body: memberBodySchema },
    responses: {
      201: {
        description: 'Team member created.',
        schema: successEnvelopeSchema(teamMemberSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(
          await teamService.createMember(tenant.id, req.valid.body as never)
        )
    },
  })

  api.patch({
    path: '/team/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-team-update',
    summary: 'Update one of the caller’s own team members',
    request: { params: idParamsSchema, body: memberPatchBodySchema },
    responses: {
      200: {
        description: 'Team member updated.',
        schema: successEnvelopeSchema(teamMemberSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await teamService.updateMember(tenant.id, id, req.valid.body as never)
        )
    },
  })

  api.delete({
    path: '/team/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-team-delete',
    summary: 'Remove one of the caller’s own team members',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Team member deleted.',
        schema: successEnvelopeSchema(teamMemberSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res.status(200).json(await teamService.deleteMember(tenant.id, id))
    },
  })

  // ---- settings / modules ----
  api.get({
    path: '/settings/modules',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-settings-modules-list',
    summary: 'List the caller’s own module settings',
    request: {},
    responses: {
      200: {
        description: 'Module settings returned.',
        schema: successEnvelopeSchema(listObjectSchema(moduleStateSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res.status(200).json(
        listObject({
          data: await settingsService.list(tenant.id),
          hasMore: false,
          url: '/v1/me/settings/modules',
        })
      )
    },
  })

  api.patch({
    path: '/settings/modules/:module',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-settings-modules-toggle',
    summary: 'Toggle one of the caller’s own modules',
    request: { params: idParamsSchema, body: toggleBodySchema },
    responses: {
      200: {
        description: 'Module setting updated.',
        schema: successEnvelopeSchema(moduleStateSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const module = String(req.params.module)
      const { is_enabled } = req.valid.body as { is_enabled: boolean }
      res
        .status(200)
        .json(await settingsService.toggle(tenant.id, module, is_enabled))
    },
  })

  api.get({
    path: '/settings/modules/:module/preferences',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-settings-modules-preferences-retrieve',
    summary:
      'Retrieve resolved preferences for one of the caller’s own modules',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Module preferences returned.',
        schema: successEnvelopeSchema(modulePreferencesSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const module = String(req.params.module)
      res
        .status(200)
        .json(await settingsService.retrievePreferences(tenant.id, module))
    },
  })

  api.patch({
    path: '/settings/modules/:module/preferences',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-settings-modules-preferences-update',
    summary: 'Update resolved preferences for one of the caller’s own modules',
    request: {
      params: idParamsSchema,
      body: modulePreferencesUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Module preferences updated.',
        schema: successEnvelopeSchema(modulePreferencesSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const module = String(req.params.module)
      res
        .status(200)
        .json(
          await settingsService.updatePreferences(
            tenant.id,
            module,
            req.valid.body as Record<string, unknown>
          )
        )
    },
  })

  // ---- addresses ----
  api.get({
    path: '/addresses',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-addresses-list',
    summary: 'List the caller’s own addresses',
    request: { query: listAddressesQuerySchema },
    responses: {
      200: {
        description: 'Addresses returned.',
        schema: successEnvelopeSchema(listObjectSchema(addressSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const result = await addressesService.listAddresses(
        tenant.id,
        req.valid.query as never
      )
      res.status(200).json(
        listObject({
          data: result.data,
          hasMore: result.hasMore,
          url: '/v1/me/addresses',
        })
      )
    },
  })

  api.post({
    path: '/addresses',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-addresses-create',
    summary: 'Create an address in the caller’s own tenant',
    request: { body: addressCreateBodySchema },
    responses: {
      201: {
        description: 'Address created.',
        schema: successEnvelopeSchema(addressSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      res
        .status(201)
        .json(
          await addressesService.createAddress(
            tenant.id,
            req.valid.body as never
          )
        )
    },
  })

  api.patch({
    path: '/addresses/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-addresses-update',
    summary: 'Update one of the caller’s own addresses',
    request: { params: idParamsSchema, body: addressUpdateBodySchema },
    responses: {
      200: {
        description: 'Address updated.',
        schema: successEnvelopeSchema(addressSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res
        .status(200)
        .json(
          await addressesService.updateAddress(
            tenant.id,
            id,
            req.valid.body as never
          )
        )
    },
  })

  api.delete({
    path: '/addresses/:id',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-addresses-delete',
    summary: 'Delete one of the caller’s own addresses',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Address deleted.',
        schema: successEnvelopeSchema(addressSchema),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const { id } = req.valid.params as IdParams
      res.status(200).json(await addressesService.deleteAddress(tenant.id, id))
    },
  })

  // ---- mailboxes ----
  api.get({
    path: '/mailboxes',
    security: 'session',
    middleware: [resolveCurrentTenant],
    operationId: 'me-mailboxes-list',
    summary: 'List the caller’s own mailboxes',
    request: { query: listMailboxesQuerySchema },
    responses: {
      200: {
        description: 'Mailboxes returned.',
        schema: successEnvelopeSchema(listObjectSchema(tenantMailboxSchema)),
      },
    },
    handler: async (req, res) => {
      const tenant = req.tenant!
      const result = await mailboxesService.listMailboxes(
        tenant.id,
        req.valid.query as never
      )
      res.status(200).json(
        listObject({
          data: result.data,
          hasMore: result.hasMore,
          url: '/v1/me/mailboxes',
        })
      )
    },
  })

  return api.router
}
