import { describe, expect, it } from 'vitest'

import {
  cloneMilestoneBodySchema,
  createMilestoneCustomFieldBodySchema,
  createMilestoneWithActorBodySchema,
  milestoneCommentBodySchema,
  updateMilestoneWithActorBodySchema,
} from '../milestone-details.schemas.js'

describe('Phase detail schemas', () => {
  it('accepts Phase create metadata with an opaque owner and server actor', () => {
    expect(
      createMilestoneWithActorBodySchema.parse({
        projectId: 'prj_1',
        key: 'launch',
        name: 'Launch',
        ownerUserId: 'usr_owner',
        actorUserId: 'usr_actor',
      })
    ).toMatchObject({
      projectId: 'prj_1',
      ownerUserId: 'usr_owner',
      actorUserId: 'usr_actor',
    })
  })

  it('does not treat actor identity alone as a Phase update', () => {
    expect(
      updateMilestoneWithActorBodySchema.safeParse({ actorUserId: 'usr_actor' })
        .success
    ).toBe(false)
  })

  it('accepts a real Phase update alongside actor identity', () => {
    expect(
      updateMilestoneWithActorBodySchema.safeParse({
        status: 'completed',
        actorUserId: 'usr_actor',
      }).success
    ).toBe(true)
  })

  it('requires valid options for select Phase fields', () => {
    expect(
      createMilestoneCustomFieldBodySchema.safeParse({
        key: 'risk',
        label: 'Risk',
        fieldType: 'select',
      }).success
    ).toBe(false)

    expect(
      createMilestoneCustomFieldBodySchema.safeParse({
        key: 'risk',
        label: 'Risk',
        fieldType: 'select',
        options: [
          { key: 'low', label: 'Low' },
          { key: 'high', label: 'High' },
        ],
      }).success
    ).toBe(true)
  })

  it('rejects duplicate select option keys', () => {
    expect(
      createMilestoneCustomFieldBodySchema.safeParse({
        key: 'risk',
        label: 'Risk',
        fieldType: 'select',
        options: [
          { key: 'high', label: 'High' },
          { key: 'high', label: 'Very high' },
        ],
      }).success
    ).toBe(false)
  })

  it('keeps Phase comments bounded and clone keys normalized', () => {
    expect(
      milestoneCommentBodySchema.safeParse({
        body: 'Ready to ship',
        authorUserId: 'usr_1',
      }).success
    ).toBe(true)
    expect(
      milestoneCommentBodySchema.safeParse({
        body: 'x'.repeat(10_001),
        authorUserId: 'usr_1',
      }).success
    ).toBe(false)
    expect(
      cloneMilestoneBodySchema.safeParse({
        key: 'Launch Copy',
        name: 'Launch copy',
      }).success
    ).toBe(false)
  })
})
