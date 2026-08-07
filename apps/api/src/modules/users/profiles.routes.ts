import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import * as controller from './users.controller'
import { consumerProfileUpdateBodySchema } from './users.schemas'
import { nowUnixSeconds } from '@/platform/timestamps'
import * as repo from './users.repository'
import * as serializers from './users.serializers'
import * as service from './users.service'
import { AppHttpError } from '@/http/errors'

export function registerProfileRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  api.post({
    path: '/:user_id/profile',
    security: 'admin',
    operationId: 'users-create_user_profile',
    summary: 'Create user profile',
    description: 'Creates a consumer profile for a user. **Admin only**.',
    request: {
      params: z.strictObject({ user_id: z.string() }),
      body: consumerProfileUpdateBodySchema,
    },
    responses: {
      201: {
        description: 'Created.',
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
      409: { description: 'Profile already exists.' },
    },
    handler: async (req, res) => {
      const { user_id } = req.params as { user_id: string }
      const user = await service.requireUser(user_id)
      const existing = await repo.findProfileByUserId(user_id)
      if (existing)
        throw new AppHttpError({
          code: 'profile/already-exists',
          message: 'A profile already exists for this user.',
          httpStatus: 409,
        })
      const now = BigInt(nowUnixSeconds())
      const profile = await repo.createProfileForUser(user_id, now)
      // apply updates like controller does
      const body = req.body as Record<string, unknown>
      const userUpdates: Record<string, unknown> = {}
      const profileUpdates: Record<string, unknown> = {}
      for (const f of ['first_name', 'last_name', 'middle_name', 'avatar'])
        if (f in body)
          (userUpdates as Record<string, unknown>)[
            f === 'first_name'
              ? 'firstName'
              : f === 'last_name'
                ? 'lastName'
                : f === 'middle_name'
                  ? 'middleName'
                  : 'avatar'
          ] = body[f]
      for (const f of [
        'nickname',
        'gender',
        'phone_number',
        'date_of_birth',
        'language',
        'timezone',
      ])
        if (f in body) {
          const map: Record<string, string> = {
            phone_number: 'phoneNumber',
            date_of_birth: 'dateOfBirth',
          }
          ;(profileUpdates as Record<string, unknown>)[map[f] ?? f] = body[f]
        }
      let updatedUser = user
      let updatedProfile = profile
      if (Object.keys(userUpdates).length > 0) {
        const u = await repo.updateUser(user_id, {
          ...userUpdates,
          updatedAt: BigInt(nowUnixSeconds()),
        } as never)
        if (u) updatedUser = u
      }
      if (Object.keys(profileUpdates).length > 0) {
        const p = await repo.updateProfile(profile.id, {
          ...profileUpdates,
          updatedAt: BigInt(nowUnixSeconds()),
        } as never)
        if (p) updatedProfile = p
      }
      res
        .status(201)
        .json(serializers.serializeConsumerProfile(updatedUser, updatedProfile))
    },
  })

  api.get({
    path: '/:user_id/profile',
    security: 'admin',
    operationId: 'users-retrieve_user_profile',
    summary: 'Retrieve user profile',
    description: 'Returns a user profile. **Admin only**.',
    request: { params: z.strictObject({ user_id: z.string() }) },
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
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { user_id } = req.params as { user_id: string }
      const user = await service.requireUser(user_id)
      const profile = await repo.findProfileByUserId(user_id)
      if (!profile)
        throw new AppHttpError({
          code: 'profile/not-found',
          message: 'No profile exists for the provided user.',
          httpStatus: 404,
        })
      res.json(serializers.serializeConsumerProfile(user, profile))
    },
  })

  api.patch({
    path: '/:user_id/profile',
    security: 'admin',
    operationId: 'users-update_user_profile',
    summary: 'Update user profile',
    description: 'Updates a user profile. **Admin only**.',
    request: {
      params: z.strictObject({ user_id: z.string() }),
      body: consumerProfileUpdateBodySchema,
    },
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
    handler: async (req, res) => {
      const { user_id } = req.params as { user_id: string }
      const user = await service.requireUser(user_id)
      let profile = await repo.findProfileByUserId(user_id)
      if (!profile) profile = await repo.ensureProfile(user_id)
      const body = req.body as Record<string, unknown>
      const userUpdates: Record<string, unknown> = {}
      const profileUpdates: Record<string, unknown> = {}
      for (const f of ['first_name', 'last_name', 'middle_name', 'avatar'])
        if (f in body)
          (userUpdates as Record<string, unknown>)[
            f === 'first_name'
              ? 'firstName'
              : f === 'last_name'
                ? 'lastName'
                : f === 'middle_name'
                  ? 'middleName'
                  : 'avatar'
          ] = body[f]
      for (const f of [
        'nickname',
        'gender',
        'phone_number',
        'date_of_birth',
        'language',
        'timezone',
      ])
        if (f in body) {
          const map: Record<string, string> = {
            phone_number: 'phoneNumber',
            date_of_birth: 'dateOfBirth',
          }
          ;(profileUpdates as Record<string, unknown>)[map[f] ?? f] = body[f]
        }
      let updatedUser = user
      let updatedProfile = profile
      if (Object.keys(userUpdates).length > 0) {
        const u = await repo.updateUser(user_id, {
          ...userUpdates,
          updatedAt: BigInt(nowUnixSeconds()),
        } as never)
        if (u) updatedUser = u
      }
      if (Object.keys(profileUpdates).length > 0) {
        const p = await repo.updateProfile(profile.id, {
          ...profileUpdates,
          updatedAt: BigInt(nowUnixSeconds()),
        } as never)
        if (p) updatedProfile = p
      }
      res.json(
        serializers.serializeConsumerProfile(updatedUser, updatedProfile)
      )
    },
  })

  api.delete({
    path: '/:user_id/profile',
    security: 'admin',
    operationId: 'users-delete_user_profile',
    summary: 'Delete user profile',
    description: 'Deletes a user profile. **Admin only**.',
    request: { params: z.strictObject({ user_id: z.string() }) },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('consumer_profile'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
    },
    handler: async (req, res) => {
      const { user_id } = req.params as { user_id: string }
      const profile = await repo.findProfileByUserId(user_id)
      if (!profile)
        throw new AppHttpError({
          code: 'profile/not-found',
          message: 'No profile exists for the provided user.',
          httpStatus: 404,
        })
      await repo.deleteProfileById(profile.id)
      res.json({ object: 'consumer_profile', id: profile.id, deleted: true })
    },
  })

  return api.router
}
