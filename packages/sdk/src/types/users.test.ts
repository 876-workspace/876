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
    email_verified: true,
    first_name: 'Ada',
    last_name: 'Lovelace',
    middle_name: null,
    avatar: null,
    avatar_file_id: null,
    status: 'active',
    banned: false,
    created_at: 1,
    updated_at: 2,
  }

  it('accepts a current user carrying a null avatar_file_id', () => {
    const parsed = sdk876CurrentUserSchema.parse(currentUser)

    expect(parsed.avatar_file_id).toBeNull()
  })

  it('accepts a current user carrying a file reference', () => {
    const parsed = sdk876CurrentUserSchema.parse({
      ...currentUser,
      avatar_file_id: 'file_abc',
    })

    expect(parsed.avatar_file_id).toBe('file_abc')
  })

  it('still rejects an undeclared field on the current user', () => {
    const result = sdk876CurrentUserSchema.safeParse({
      ...currentUser,
      not_a_real_field: 'x',
    })

    expect(result.success).toBe(false)
  })

  it('accepts a consumer profile carrying avatar_file_id', () => {
    const parsed = sdk876ConsumerProfileSchema.parse({
      object: 'consumer_profile' as const,
      id: 'cprof_1',
      user_id: 'user_123',
      email: 'ada@example.com',
      username: null,
      first_name: 'Ada',
      last_name: 'Lovelace',
      middle_name: null,
      nickname: null,
      avatar: null,
      avatar_file_id: 'file_abc',
      gender: null,
      phone_number: null,
      date_of_birth: null,
      language: null,
      timezone: null,
      created_at: 1,
      updated_at: 2,
    })

    expect(parsed.avatar_file_id).toBe('file_abc')
  })

  it('accepts a consumer contact user carrying avatar_file_id', () => {
    const parsed = sdk876ConsumerContactUserSchema.parse({
      object: 'user' as const,
      id: 'user_456',
      email: 'grace@example.com',
      username: null,
      first_name: 'Grace',
      last_name: 'Hopper',
      middle_name: null,
      avatar: null,
      avatar_file_id: null,
    })

    expect(parsed.avatar_file_id).toBeNull()
  })
})
