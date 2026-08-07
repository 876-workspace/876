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
  owner_user_id: z.string(),
  contact_user_id: z.string(),
  contact_user: z.object({
    object: z.literal('user'),
    id: z.string(),
    email: z.string(),
    username: z.string().nullable(),
    first_name: z.string(),
    last_name: z.string(),
    middle_name: z.string().nullable(),
    avatar: z.string().nullable(),
    avatar_file_id: z.string().nullable(),
  }),
  nickname: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export function registerContactRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  api.get({
    path: '/:user_id/contacts',
    security: 'admin',
    operationId: 'users-list_user_contacts',
    summary: 'List user contacts',
    description: 'Returns contacts for a user. **Admin only**.',
    request: { params: z.strictObject({ user_id: z.string() }) },
    responses: {
      200: {
        description: 'Contacts.',
        schema: listObjectSchema(contactSchema),
      },
    },
    handler: async (req, res) => {
      const { user_id } = req.params as { user_id: string }
      await service.requireUser(user_id)
      const rows = await repo.listContactsByOwner(user_id)
      res.json({
        object: 'list',
        data: rows.map((r: unknown) =>
          serializers.serializeContact(r as never)
        ),
        has_more: false,
        url: `/users/${user_id}/contacts`,
        total_count: null,
      })
    },
  })

  api.post({
    path: '/:user_id/contacts',
    security: 'admin',
    operationId: 'users-create_user_contact',
    summary: 'Create user contact',
    description: 'Creates a contact for a user. **Admin only**.',
    request: {
      params: z.strictObject({ user_id: z.string() }),
      body: consumerContactCreateBodySchema,
    },
    responses: {
      201: { description: 'Created.', schema: contactSchema },
      409: { description: 'Already exists.' },
    },
    handler: async (req, res) => {
      const { user_id } = req.params as { user_id: string }
      const body = req.body as {
        contactUserId: string
        nickname?: string | null
        notes?: string | null
      }
      await service.requireUser(user_id)
      const contactUser = await service.requireUser(body.contactUserId)
      if (user_id === body.contactUserId)
        throw new AppHttpError({
          code: 'contact/self-contact',
          message: 'A user cannot save themself as a contact.',
          httpStatus: 400,
        })
      if (await repo.getContactByPair(user_id, body.contactUserId))
        throw new AppHttpError({
          code: 'contact/already-exists',
          message: 'This user is already saved as a contact.',
          httpStatus: 409,
        })
      const now = BigInt(nowUnixSeconds())
      const contact = await repo.createContact({
        id: generateId('contact'),
        ownerUserId: user_id,
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
    path: '/:user_id/contacts/:contact_id',
    security: 'admin',
    operationId: 'users-retrieve_user_contact',
    summary: 'Retrieve user contact',
    description: 'Returns one contact. **Admin only**.',
    request: {
      params: z.strictObject({ user_id: z.string(), contact_id: z.string() }),
    },
    responses: {
      200: { description: 'Contact.', schema: contactSchema },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { user_id, contact_id } = req.params as {
        user_id: string
        contact_id: string
      }
      const contact = await repo.getContactForOwner(contact_id, user_id)
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
    path: '/:user_id/contacts/:contact_id',
    security: 'admin',
    operationId: 'users-update_user_contact',
    summary: 'Update user contact',
    description: 'Updates a contact. **Admin only**.',
    request: {
      params: z.strictObject({ user_id: z.string(), contact_id: z.string() }),
      body: consumerContactUpdateBodySchema,
    },
    responses: {
      200: { description: 'Updated.', schema: contactSchema },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { user_id, contact_id } = req.params as {
        user_id: string
        contact_id: string
      }
      const body = req.body as Record<string, unknown>
      if (Object.keys(body).length === 0)
        throw new AppHttpError({
          code: 'provider/invalid-request',
          message: 'No fields to update.',
          httpStatus: 400,
        })
      const updated = await repo.updateContactForOwner(contact_id, user_id, {
        ...body,
        updatedAt: BigInt(nowUnixSeconds()),
      } as never)
      if (!updated)
        throw new AppHttpError({
          code: 'contact/not-found',
          message: 'Contact not found.',
          httpStatus: 404,
        })
      const loaded = await repo.getContactForOwner(contact_id, user_id)
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
    path: '/:user_id/contacts/:contact_id',
    security: 'admin',
    operationId: 'users-delete_user_contact',
    summary: 'Delete user contact',
    description: 'Deletes a contact. **Admin only**.',
    request: {
      params: z.strictObject({ user_id: z.string(), contact_id: z.string() }),
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
      const { user_id, contact_id } = req.params as {
        user_id: string
        contact_id: string
      }
      const deleted = await repo.deleteContactForOwner(contact_id, user_id)
      if (!deleted)
        throw new AppHttpError({
          code: 'contact/not-found',
          message: 'Contact not found.',
          httpStatus: 404,
        })
      res.json({ object: 'user_contact', id: contact_id, deleted: true })
    },
  })

  return api.router
}
