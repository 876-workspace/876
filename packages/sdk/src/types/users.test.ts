import { describe, expect, it } from 'vitest'

import {
  sdk876ConsumerContactUserSchema,
  sdk876ConsumerProfileSchema,
  sdk876CurrentUserSchema,
} from './users.ts'

/**
 * Regression coverage for the canonical 876 Storage avatar reference.
 *
 * These schemas are `z.strictObject`, so a field added to the API response
 * without being declared here makes every call fail with
 * `auth/invalid-response` rather than surfacing the new data. `/users/me`
 * started returning `avatar_file_id` when `users.avatar_file_id` landed.
 */
describe('avatar_file_id on the strict user schemas', () => {
  const currentUser = {
    object: 'user' as const,
    id: 'user_123',
    email: 'ada@example.com',
    username: 'ada',
    emailVerified: true,
    firstName: 'Ada',
    lastName: 'Lovelace',
    middleName: null,
    avatar: null,
    avatarFileId: null,
    status: 'active',
    banned: false,
    createdAt: 1,
    updatedAt: 2,
  }

  it('accepts a current user carrying a null avatar_file_id', () => {
    const parsed = sdk876CurrentUserSchema.parse(currentUser)

    expect(parsed.avatar_file_id).toBeNull()
  })

  it('accepts a current user carrying a file reference', () => {
    const parsed = sdk876CurrentUserSchema.parse({
      ...currentUser,
      avatarFileId: 'file_abc',
    })

    expect(parsed.avatar_file_id).toBe('file_abc')
  })

  it('still rejects an undeclared field on the current user', () => {
    const result = sdk876CurrentUserSchema.safeParse({
      ...currentUser,
      notARealField: 'x',
    })

    expect(result.success).toBe(false)
  })

  it('accepts a consumer profile carrying avatar_file_id', () => {
    const parsed = sdk876ConsumerProfileSchema.parse({
      object: 'consumer_profile' as const,
      id: 'cprof_1',
      userId: 'user_123',
      email: 'ada@example.com',
      username: null,
      firstName: 'Ada',
      lastName: 'Lovelace',
      middleName: null,
      nickname: null,
      avatar: null,
      avatarFileId: 'file_abc',
      gender: null,
      phoneNumber: null,
      dateOfBirth: null,
      language: null,
      timezone: null,
      createdAt: 1,
      updatedAt: 2,
    })

    expect(parsed.avatar_file_id).toBe('file_abc')
  })

  it('accepts a consumer contact user carrying avatar_file_id', () => {
    const parsed = sdk876ConsumerContactUserSchema.parse({
      object: 'user' as const,
      id: 'user_456',
      email: 'grace@example.com',
      username: null,
      firstName: 'Grace',
      lastName: 'Hopper',
      middleName: null,
      avatar: null,
      avatarFileId: null,
    })

    expect(parsed.avatar_file_id).toBeNull()
  })
})
