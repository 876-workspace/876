import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'
import * as docs from './users.docs'
import * as controller from './users.controller'
import {
  consumerProfileUpdateBodySchema,
  consumerAddressCreateBodySchema,
  consumerAddressUpdateBodySchema,
  consumerContactCreateBodySchema,
  consumerContactUpdateBodySchema,
} from './users.schemas'

export function registerSelfRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  api.get({
    path: '/me/profile',
    security: 'session',
    operationId: 'users-retrieve_my_profile',
    summary: docs.RETRIEVE_MY_PROFILE_SUMMARY,
    description: docs.RETRIEVE_MY_PROFILE_DESCRIPTION,
    responses: {
      200: {
        description: 'Profile.',
        schema: z.object({
          object: z.literal('consumer_profile'),
          id: z.string(),
          user_id: z.string(),
          email: z.string(),
          username: z.string().nullable(),
          first_name: z.string(),
          last_name: z.string(),
          middle_name: z.string().nullable(),
          nickname: z.string().nullable(),
          avatar: z.string().nullable(),
          avatar_file_id: z.string().nullable(),
          gender: z.string().nullable(),
          phone_number: z.string().nullable(),
          date_of_birth: z.string().nullable(),
          language: z.string().nullable(),
          timezone: z.string().nullable(),
          created_at: z.number().int(),
          updated_at: z.number().int(),
        }),
      },
    },
    handler: controller.retrieveMyProfile,
  })

  api.patch({
    path: '/me/profile',
    security: 'session',
    operationId: 'users-update_my_profile',
    summary: docs.UPDATE_MY_PROFILE_SUMMARY,
    description: docs.UPDATE_MY_PROFILE_DESCRIPTION,
    request: { body: consumerProfileUpdateBodySchema },
    responses: {
      200: {
        description: 'Updated.',
        schema: z.object({
          object: z.literal('consumer_profile'),
          id: z.string(),
          user_id: z.string(),
          email: z.string(),
          username: z.string().nullable(),
          first_name: z.string(),
          last_name: z.string(),
          middle_name: z.string().nullable(),
          nickname: z.string().nullable(),
          avatar: z.string().nullable(),
          avatar_file_id: z.string().nullable(),
          gender: z.string().nullable(),
          phone_number: z.string().nullable(),
          date_of_birth: z.string().nullable(),
          language: z.string().nullable(),
          timezone: z.string().nullable(),
          created_at: z.number().int(),
          updated_at: z.number().int(),
        }),
      },
    },
    handler: controller.updateMyProfile,
  })

  api.get({
    path: '/me/addresses',
    security: 'session',
    operationId: 'users-list_my_addresses',
    summary: docs.LIST_MY_ADDRESSES_SUMMARY,
    description: docs.LIST_MY_ADDRESSES_DESCRIPTION,
    responses: {
      200: {
        description: 'Addresses.',
        schema: listObjectSchema(
          z.object({
            object: z.literal('address'),
            id: z.string(),
            user_id: z.string().nullable(),
            organization_id: z.string().nullable(),
            type: z.string(),
            label: z.string().nullable(),
            line1: z.string().nullable(),
            line2: z.string().nullable(),
            city: z.string().nullable(),
            region_id: z.string().nullable(),
            country_code: z.string().nullable(),
            postal_code: z.string().nullable(),
            is_default: z.boolean(),
            created_at: z.number().int(),
            updated_at: z.number().int(),
          })
        ),
      },
    },
    handler: controller.listMyAddresses,
  })

  api.post({
    path: '/me/addresses',
    security: 'session',
    operationId: 'users-create_my_address',
    summary: docs.CREATE_MY_ADDRESS_SUMMARY,
    description: docs.CREATE_MY_ADDRESS_DESCRIPTION,
    request: { body: consumerAddressCreateBodySchema },
    responses: {
      201: {
        description: 'Created.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          user_id: z.string().nullable(),
          organization_id: z.string().nullable(),
          type: z.string(),
          label: z.string().nullable(),
          line1: z.string().nullable(),
          line2: z.string().nullable(),
          city: z.string().nullable(),
          region_id: z.string().nullable(),
          country_code: z.string().nullable(),
          postal_code: z.string().nullable(),
          is_default: z.boolean(),
          created_at: z.number().int(),
          updated_at: z.number().int(),
        }),
      },
    },
    handler: controller.createMyAddress,
  })

  api.get({
    path: '/me/addresses/:address_id',
    security: 'session',
    operationId: 'users-retrieve_my_address',
    summary: docs.RETRIEVE_MY_ADDRESS_SUMMARY,
    description: docs.RETRIEVE_MY_ADDRESS_DESCRIPTION,
    request: { params: z.strictObject({ address_id: z.string() }) },
    responses: {
      200: {
        description: 'Address.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          user_id: z.string().nullable(),
          organization_id: z.string().nullable(),
          type: z.string(),
          label: z.string().nullable(),
          line1: z.string().nullable(),
          line2: z.string().nullable(),
          city: z.string().nullable(),
          region_id: z.string().nullable(),
          country_code: z.string().nullable(),
          postal_code: z.string().nullable(),
          is_default: z.boolean(),
          created_at: z.number().int(),
          updated_at: z.number().int(),
        }),
      },
      404: docs.RETRIEVE_MY_ADDRESS_RESPONSES[404],
    },
    handler: controller.retrieveMyAddress,
  })

  api.patch({
    path: '/me/addresses/:address_id',
    security: 'session',
    operationId: 'users-update_my_address',
    summary: docs.UPDATE_MY_ADDRESS_SUMMARY,
    description: docs.UPDATE_MY_ADDRESS_DESCRIPTION,
    request: {
      params: z.strictObject({ address_id: z.string() }),
      body: consumerAddressUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Updated.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          user_id: z.string().nullable(),
          organization_id: z.string().nullable(),
          type: z.string(),
          label: z.string().nullable(),
          line1: z.string().nullable(),
          line2: z.string().nullable(),
          city: z.string().nullable(),
          region_id: z.string().nullable(),
          country_code: z.string().nullable(),
          postal_code: z.string().nullable(),
          is_default: z.boolean(),
          created_at: z.number().int(),
          updated_at: z.number().int(),
        }),
      },
      404: docs.UPDATE_MY_ADDRESS_RESPONSES[404],
    },
    handler: controller.updateMyAddress,
  })

  api.delete({
    path: '/me/addresses/:address_id',
    security: 'session',
    operationId: 'users-delete_my_address',
    summary: docs.DELETE_MY_ADDRESS_SUMMARY,
    description: docs.DELETE_MY_ADDRESS_DESCRIPTION,
    request: { params: z.strictObject({ address_id: z.string() }) },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('address'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: docs.DELETE_MY_ADDRESS_RESPONSES[404],
    },
    handler: controller.deleteMyAddress,
  })

  api.get({
    path: '/me/contacts',
    security: 'session',
    operationId: 'users-list_my_contacts',
    summary: docs.LIST_MY_CONTACTS_SUMMARY,
    description: docs.LIST_MY_CONTACTS_DESCRIPTION,
    responses: {
      200: {
        description: 'Contacts.',
        schema: listObjectSchema(
          z.object({
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
        ),
      },
    },
    handler: controller.listMyContacts,
  })

  api.post({
    path: '/me/contacts',
    security: 'session',
    operationId: 'users-create_my_contact',
    summary: docs.CREATE_MY_CONTACT_SUMMARY,
    description: docs.CREATE_MY_CONTACT_DESCRIPTION,
    request: { body: consumerContactCreateBodySchema },
    responses: {
      201: {
        description: 'Created.',
        schema: z.object({
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
        }),
      },
      400: docs.CREATE_MY_CONTACT_RESPONSES[400],
    },
    handler: controller.createMyContact,
  })

  api.get({
    path: '/me/contacts/:contact_id',
    security: 'session',
    operationId: 'users-retrieve_my_contact',
    summary: docs.RETRIEVE_MY_CONTACT_SUMMARY,
    description: docs.RETRIEVE_MY_CONTACT_DESCRIPTION,
    request: { params: z.strictObject({ contact_id: z.string() }) },
    responses: {
      200: {
        description: 'Contact.',
        schema: z.object({
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
        }),
      },
      404: docs.RETRIEVE_MY_CONTACT_RESPONSES[404],
    },
    handler: controller.retrieveMyContact,
  })

  api.patch({
    path: '/me/contacts/:contact_id',
    security: 'session',
    operationId: 'users-update_my_contact',
    summary: docs.UPDATE_MY_CONTACT_SUMMARY,
    description: docs.UPDATE_MY_CONTACT_DESCRIPTION,
    request: {
      params: z.strictObject({ contact_id: z.string() }),
      body: consumerContactUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Updated.',
        schema: z.object({
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
        }),
      },
      404: docs.UPDATE_MY_CONTACT_RESPONSES[404],
    },
    handler: controller.updateMyContact,
  })

  api.delete({
    path: '/me/contacts/:contact_id',
    security: 'session',
    operationId: 'users-delete_my_contact',
    summary: docs.DELETE_MY_CONTACT_SUMMARY,
    description: docs.DELETE_MY_CONTACT_DESCRIPTION,
    request: { params: z.strictObject({ contact_id: z.string() }) },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('user_contact'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: docs.DELETE_MY_CONTACT_RESPONSES[404],
    },
    handler: controller.deleteMyContact,
  })

  api.get({
    path: '/me/memberships',
    security: 'session',
    operationId: 'users-list_my_memberships',
    summary: docs.LIST_MY_MEMBERSHIPS_SUMMARY,
    description: docs.LIST_MY_MEMBERSHIPS_DESCRIPTION,
    request: { query: z.strictObject({ status: z.string().optional() }) },
    responses: {
      200: {
        description: 'Memberships.',
        schema: listObjectSchema(
          z.object({
            id: z.string(),
            role: z.string(),
            status: z.string(),
            permissions: z.array(z.string()),
            organization: z.object({
              id: z.string(),
              name: z.string().nullable(),
              slug: z.string(),
              status: z.string(),
              logo_url: z.string().nullable(),
            }),
          })
        ),
      },
    },
    handler: controller.listMyMemberships,
  })

  return api.router
}
