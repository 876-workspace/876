import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'
import * as repo from './users.repository'
import * as service from './users.service'
import * as serializers from './users.serializers'
import {
  consumerContactCreateBodySchema,
  consumerContactUpdateBodySchema,
} from './users.schemas'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { AppHttpError } from '@/http/errors'

const contactSchema = z.object({
  object: z.literal('user_contact'),
  id: z.string(),
  ownerUserId: z.string(),
  contactUserId: z.string(),
  contactUser: z.object({
    object: z.literal('user'),
    id: z.string(),
    email: z.string(),
    username: z.string().nullable(),
    firstName: z.string(),
    lastName: z.string(),
    middleName: z.string().nullable(),
    avatar: z.string().nullable(),
    avatarFileId: z.string().nullable(),
  }),
  nickname: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export function registerContactRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  api.get({
    path: '/:userId/contacts',
    security: 'admin',
    operationId: 'users-list_user_contacts',
    summary: 'List user contacts',
    description: 'Returns contacts for a user. **Admin only**.',
    request: { params: z.strictObject({ userId: z.string() }) },
    responses: {
      200: {
        description: 'Contacts.',
        schema: listObjectSchema(contactSchema),
      },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      await service.requireUser(userId)
      const rows = await repo.listContactsByOwner(userId)
      res.json({
        object: 'list',
        data: rows.map((r: unknown) =>
          serializers.serializeContact(r as never)
        ),
        has_more: false,
        url: `/users/${userId}/contacts`,
        totalCount: null,
      })
    },
  })

  api.post({
    path: '/:userId/contacts',
    security: 'admin',
    operationId: 'users-create_user_contact',
    summary: 'Create user contact',
    description: 'Creates a contact for a user. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string() }),
      body: consumerContactCreateBodySchema,
    },
    responses: {
      201: { description: 'Created.', schema: contactSchema },
      409: { description: 'Already exists.' },
    },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      const body = req.body as {
        contactUserId: string
        nickname?: string | null
        notes?: string | null
      }
      await service.requireUser(userId)
      const contactUser = await service.requireUser(body.contactUserId)
      if (userId === body.contactUserId)
        throw new AppHttpError({
          code: 'contact/self-contact',
          message: 'A user cannot save themself as a contact.',
          httpStatus: 400,
        })
      if (await repo.getContactByPair(userId, body.contactUserId))
        throw new AppHttpError({
          code: 'contact/already-exists',
          message: 'This user is already saved as a contact.',
          httpStatus: 409,
        })
      const now = BigInt(nowUnixSeconds())
      const contact = await repo.createContact({
        id: generateId('contact'),
        ownerUserId: userId,
        contactUserId: contactUser.id,
        nickname: body.nickname ?? null,
        notes: body.notes ?? null,
        createdAt: now,
        updatedAt: now,
      } as never)
      res.status(201).json(serializers.serializeContact(contact as never))
    },
  })

  api.get({
    path: '/:userId/contacts/:contactId',
    security: 'admin',
    operationId: 'users-retrieve_user_contact',
    summary: 'Retrieve user contact',
    description: 'Returns one contact. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string(), contactId: z.string() }),
    },
    responses: {
      200: { description: 'Contact.', schema: contactSchema },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { userId, contactId } = req.params as {
        userId: string
        contactId: string
      }
      const contact = await repo.getContactForOwner(contactId, userId)
      if (!contact)
        throw new AppHttpError({
          code: 'contact/not-found',
          message: 'Contact not found.',
          httpStatus: 404,
        })
      res.json(serializers.serializeContact(contact as never))
    },
  })

  api.patch({
    path: '/:userId/contacts/:contactId',
    security: 'admin',
    operationId: 'users-update_user_contact',
    summary: 'Update user contact',
    description: 'Updates a contact. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string(), contactId: z.string() }),
      body: consumerContactUpdateBodySchema,
    },
    responses: {
      200: { description: 'Updated.', schema: contactSchema },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { userId, contactId } = req.params as {
        userId: string
        contactId: string
      }
      const body = req.body as Record<string, unknown>
      if (Object.keys(body).length === 0)
        throw new AppHttpError({
          code: 'provider/invalid-request',
          message: 'No fields to update.',
          httpStatus: 400,
        })
      const updated = await repo.updateContactForOwner(contactId, userId, {
        ...body,
        updatedAt: BigInt(nowUnixSeconds()),
      } as never)
      if (!updated)
        throw new AppHttpError({
          code: 'contact/not-found',
          message: 'Contact not found.',
          httpStatus: 404,
        })
      const loaded = await repo.getContactForOwner(contactId, userId)
      if (!loaded)
        throw new AppHttpError({
          code: 'contact/not-found',
          message: 'Contact not found.',
          httpStatus: 404,
        })
      res.json(serializers.serializeContact(loaded as never))
    },
  })

  api.delete({
    path: '/:userId/contacts/:contactId',
    security: 'admin',
    operationId: 'users-delete_user_contact',
    summary: 'Delete user contact',
    description: 'Deletes a contact. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string(), contactId: z.string() }),
    },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('user_contact'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { userId, contactId } = req.params as {
        userId: string
        contactId: string
      }
      const deleted = await repo.deleteContactForOwner(contactId, userId)
      if (!deleted)
        throw new AppHttpError({
          code: 'contact/not-found',
          message: 'Contact not found.',
          httpStatus: 404,
        })
      res.json({ object: 'user_contact', id: contactId, deleted: true })
    },
  })

  return api.router
}
