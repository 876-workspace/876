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
    path: '/:userId/profile',
    security: 'admin',
    operationId: 'users-create_user_profile',
    summary: 'Create user profile',
    description: 'Creates a consumer profile for a user. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string() }),
      body: consumerProfileUpdateBodySchema,
    },
    responses: {
      201: {
        description: 'Created.',
        schema: z.object({
          object: z.literal('consumer_profile'),
          id: z.string(),
          userId: z.string(),
          email: z.string(),
          username: z.string().nullable(),
          firstName: z.string(),
          lastName: z.string(),
          middleName: z.string().nullable(),
          nickname: z.string().nullable(),
          avatar: z.string().nullable(),
          avatarFileId: z.string().nullable(),
          gender: z.string().nullable(),
          phoneNumber: z.string().nullable(),
          dateOfBirth: z.string().nullable(),
          language: z.string().nullable(),
          timezone: z.string().nullable(),
          createdAt: z.number().int(),
          updatedAt: z.number().int(),
        }),
      },
      409: { description: 'Profile already exists.' },
    },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      const user = await service.requireUser(userId)
      const existing = await repo.findProfileByUserId(userId)
      if (existing)
        throw new AppHttpError({
          code: 'profile/already-exists',
          message: 'A profile already exists for this user.',
          httpStatus: 409,
        })
      const now = BigInt(nowUnixSeconds())
      const profile = await repo.createProfileForUser(userId, now)
      // apply updates like controller does
      const body = req.body as Record<string, unknown>
      const userUpdates: Record<string, unknown> = {}
      const profileUpdates: Record<string, unknown> = {}
      for (const f of ['firstName', 'lastName', 'middleName', 'avatar'])
        if (f in body)
          (userUpdates as Record<string, unknown>)[
            f === 'firstName'
              ? 'firstName'
              : f === 'lastName'
                ? 'lastName'
                : f === 'middleName'
                  ? 'middleName'
                  : 'avatar'
          ] = body[f]
      for (const f of [
        'nickname',
        'gender',
        'phoneNumber',
        'dateOfBirth',
        'language',
        'timezone',
      ])
        if (f in body) {
          const map: Record<string, string> = {
            phoneNumber: 'phoneNumber',
            dateOfBirth: 'dateOfBirth',
          }
          ;(profileUpdates as Record<string, unknown>)[map[f] ?? f] = body[f]
        }
      let updatedUser = user
      let updatedProfile = profile
      if (Object.keys(userUpdates).length > 0) {
        const u = await repo.updateUser(userId, {
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
    path: '/:userId/profile',
    security: 'admin',
    operationId: 'users-retrieve_user_profile',
    summary: 'Retrieve user profile',
    description: 'Returns a user profile. **Admin only**.',
    request: { params: z.strictObject({ userId: z.string() }) },
    responses: {
      200: {
        description: 'Profile.',
        schema: z.object({
          object: z.literal('consumer_profile'),
          id: z.string(),
          userId: z.string(),
          email: z.string(),
          username: z.string().nullable(),
          firstName: z.string(),
          lastName: z.string(),
          middleName: z.string().nullable(),
          nickname: z.string().nullable(),
          avatar: z.string().nullable(),
          avatarFileId: z.string().nullable(),
          gender: z.string().nullable(),
          phoneNumber: z.string().nullable(),
          dateOfBirth: z.string().nullable(),
          language: z.string().nullable(),
          timezone: z.string().nullable(),
          createdAt: z.number().int(),
          updatedAt: z.number().int(),
        }),
      },
      404: { description: 'Not found.' },
    },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      const user = await service.requireUser(userId)
      const profile = await repo.findProfileByUserId(userId)
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
    path: '/:userId/profile',
    security: 'admin',
    operationId: 'users-update_user_profile',
    summary: 'Update user profile',
    description: 'Updates a user profile. **Admin only**.',
    request: {
      params: z.strictObject({ userId: z.string() }),
      body: consumerProfileUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Updated.',
        schema: z.object({
          object: z.literal('consumer_profile'),
          id: z.string(),
          userId: z.string(),
          email: z.string(),
          username: z.string().nullable(),
          firstName: z.string(),
          lastName: z.string(),
          middleName: z.string().nullable(),
          nickname: z.string().nullable(),
          avatar: z.string().nullable(),
          avatarFileId: z.string().nullable(),
          gender: z.string().nullable(),
          phoneNumber: z.string().nullable(),
          dateOfBirth: z.string().nullable(),
          language: z.string().nullable(),
          timezone: z.string().nullable(),
          createdAt: z.number().int(),
          updatedAt: z.number().int(),
        }),
      },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      const user = await service.requireUser(userId)
      let profile = await repo.findProfileByUserId(userId)
      if (!profile) profile = await repo.ensureProfile(userId)
      const body = req.body as Record<string, unknown>
      const userUpdates: Record<string, unknown> = {}
      const profileUpdates: Record<string, unknown> = {}
      for (const f of ['firstName', 'lastName', 'middleName', 'avatar'])
        if (f in body)
          (userUpdates as Record<string, unknown>)[
            f === 'firstName'
              ? 'firstName'
              : f === 'lastName'
                ? 'lastName'
                : f === 'middleName'
                  ? 'middleName'
                  : 'avatar'
          ] = body[f]
      for (const f of [
        'nickname',
        'gender',
        'phoneNumber',
        'dateOfBirth',
        'language',
        'timezone',
      ])
        if (f in body) {
          const map: Record<string, string> = {
            phoneNumber: 'phoneNumber',
            dateOfBirth: 'dateOfBirth',
          }
          ;(profileUpdates as Record<string, unknown>)[map[f] ?? f] = body[f]
        }
      let updatedUser = user
      let updatedProfile = profile
      if (Object.keys(userUpdates).length > 0) {
        const u = await repo.updateUser(userId, {
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
    path: '/:userId/profile',
    security: 'admin',
    operationId: 'users-delete_user_profile',
    summary: 'Delete user profile',
    description: 'Deletes a user profile. **Admin only**.',
    request: { params: z.strictObject({ userId: z.string() }) },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('consumer_profile'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
    handler: async (req, res) => {
      const { userId } = req.params as { userId: string }
      const profile = await repo.findProfileByUserId(userId)
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
