import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'
import * as repo from './users.repository'
import * as service from './users.service'
import * as serializers from './users.serializers'
import {
  consumerAddressCreateBodySchema,
  consumerAddressUpdateBodySchema,
} from './users.schemas'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { AppHttpError } from '@/http/errors'

export function registerAddressRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  api.get({
    path: '/:userId/addresses',
    security: 'admin',
    operationId: 'users-list_user_addresses',
    summary: 'List user addresses',
    description: 'Returns addresses for a user. **Admin only**.',
    request: { params: z.strictObject({ userId: z.string() }) },
    responses: {
      200: {
        description: 'Addresses.',
        schema: listObjectSchema(
          z.object({
            object: z.literal('address'),
            id: z.string(),
            userId: z.string().nullable(),
            organizationId: z.string().nullable(),
            type: z.string(),
            label: z.string().nullable(),
            line1: z.string().nullable(),
            line2: z.string().nullable(),
            city: z.string().nullable(),
            regionId: z.string().nullable(),
            countryCode: z.string().nullable(),
            postalCode: z.string().nullable(),
            isDefault: z.boolean(),
            createdAt: z.number().int(),
            updatedAt: z.number().int(),
          })
        ),
      },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      await service.requireUser(userId)
      const rows = await repo.listAddressesByUser(userId)
      res.json({
        object: 'list',
        data: rows.map((r: unknown) =>
          serializers.serializeAddress(r as never)
        ),
        has_more: false,
        url: `/users/${userId}/addresses`,
        totalCount: null,
      })
    },
  })

  api.post({
    path: '/:userId/addresses',
    security: 'admin',
    operationId: 'users-create_user_address',
    summary: 'Create user address',
    description: 'Creates an address for a user. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string() }),
      body: consumerAddressCreateBodySchema,
    },
    responses: {
      201: {
        description: 'Created.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          userId: z.string().nullable(),
          organizationId: z.string().nullable(),
          type: z.string(),
          label: z.string().nullable(),
          line1: z.string().nullable(),
          line2: z.string().nullable(),
          city: z.string().nullable(),
          regionId: z.string().nullable(),
          countryCode: z.string().nullable(),
          postalCode: z.string().nullable(),
          isDefault: z.boolean(),
          createdAt: z.number().int(),
          updatedAt: z.number().int(),
        }),
      },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      await service.requireUser(userId)
      const body = req.body as Record<string, unknown>
      const now = BigInt(nowUnixSeconds())
      const address = await repo.createAddress({
        id: generateId('address'),
        userId: userId,
        organizationId: null,
        type: (body.type as string) ?? 'other',
        label: body.label ?? null,
        line1: body.line1 ?? null,
        line2: body.line2 ?? null,
        city: body.city ?? null,
        regionId: body.regionId ?? null,
        countryCode: body.countryCode ?? null,
        postalCode: body.postalCode ?? null,
        isDefault: body.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      } as never)
      res.status(201).json(serializers.serializeAddress(address as never))
    },
  })

  api.get({
    path: '/:userId/addresses/:addressId',
    security: 'admin',
    operationId: 'users-retrieve_user_address',
    summary: 'Retrieve user address',
    description: 'Returns one address. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string(), addressId: z.string() }),
    },
    responses: {
      200: {
        description: 'Address.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          userId: z.string().nullable(),
          organizationId: z.string().nullable(),
          type: z.string(),
          label: z.string().nullable(),
          line1: z.string().nullable(),
          line2: z.string().nullable(),
          city: z.string().nullable(),
          regionId: z.string().nullable(),
          countryCode: z.string().nullable(),
          postalCode: z.string().nullable(),
          isDefault: z.boolean(),
          createdAt: z.number().int(),
          updatedAt: z.number().int(),
        }),
      },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { userId, addressId } = req.params as {
        userId: string
        addressId: string
      }
      const address = await repo.getAddressForUser(addressId, userId)
      if (!address)
        throw new AppHttpError({
          code: 'address/not-found',
          message: 'Address not found.',
          httpStatus: 404,
        })
      res.json(serializers.serializeAddress(address as never))
    },
  })

  api.patch({
    path: '/:userId/addresses/:addressId',
    security: 'admin',
    operationId: 'users-update_user_address',
    summary: 'Update user address',
    description: 'Updates an address. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string(), addressId: z.string() }),
      body: consumerAddressUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Updated.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          userId: z.string().nullable(),
          organizationId: z.string().nullable(),
          type: z.string(),
          label: z.string().nullable(),
          line1: z.string().nullable(),
          line2: z.string().nullable(),
          city: z.string().nullable(),
          regionId: z.string().nullable(),
          countryCode: z.string().nullable(),
          postalCode: z.string().nullable(),
          isDefault: z.boolean(),
          createdAt: z.number().int(),
          updatedAt: z.number().int(),
        }),
      },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { userId, addressId } = req.params as {
        userId: string
        addressId: string
      }
      const body = req.body as Record<string, unknown>
      if (Object.keys(body).length === 0)
        throw new AppHttpError({
          code: 'provider/invalid-request',
          message: 'No fields to update.',
          httpStatus: 400,
        })
      const updated = await repo.updateAddressForUser(addressId, userId, {
        ...body,
        updatedAt: BigInt(nowUnixSeconds()),
      } as never)
      if (!updated)
        throw new AppHttpError({
          code: 'address/not-found',
          message: 'Address not found.',
          httpStatus: 404,
        })
      res.json(serializers.serializeAddress(updated as never))
    },
  })

  api.delete({
    path: '/:userId/addresses/:addressId',
    security: 'admin',
    operationId: 'users-delete_user_address',
    summary: 'Delete user address',
    description: 'Deletes an address. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string(), addressId: z.string() }),
    },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { userId, addressId } = req.params as {
        userId: string
        addressId: string
      }
      const deleted = await repo.deleteAddressForUser(addressId, userId)
      if (!deleted)
        throw new AppHttpError({
          code: 'address/not-found',
          message: 'Address not found.',
          httpStatus: 404,
        })
      res.json({ object: 'address', id: addressId, deleted: true })
    },
  })

  return api.router
}
