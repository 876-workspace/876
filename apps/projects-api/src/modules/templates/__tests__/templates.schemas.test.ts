import { describe, expect, it } from 'vitest'

import {
  cloneProjectBodySchema,
  createTemplateBodySchema,
  instantiateTemplateBodySchema,
  previewTemplateBodySchema,
  saveAsTemplateBodySchema,
  templateDefinitionSchema,
  updateTemplateBodySchema,
} from '../templates.schemas.js'

const MINIMAL_DEFINITION = { schemaVersion: 1 } as const

describe('templateDefinitionSchema', () => {
  it('accepts a minimal definition', () => {
    expect(
      templateDefinitionSchema.safeParse(MINIMAL_DEFINITION).success,
    ).toBe(true)
  })

  it('rejects an unknown schema version', () => {
    expect(
      templateDefinitionSchema.safeParse({ schemaVersion: 2 }).success,
    ).toBe(false)
  })

  it('rejects non-kebab work item type keys', () => {
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        workItems: [
          { ref: 'a', title: 'A', typeKey: 'NotAKebab', stateKey: 'todo' },
        ],
      }).success,
    ).toBe(false)
  })

  it('rejects unknown priorities', () => {
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        workItems: [
          {
            ref: 'a',
            title: 'A',
            typeKey: 'task',
            stateKey: 'todo',
            priority: 'whenever',
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('requires exactly one of amountMinor or hours on budgets', () => {
    const scope = { scope: 'project', thresholdPercent: 80 } as const
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        budgetDefaults: [{ ...scope }],
      }).success,
    ).toBe(false)
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        budgetDefaults: [{ ...scope, amountMinor: 10, hours: 2 }],
      }).success,
    ).toBe(false)
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        budgetDefaults: [{ ...scope, hours: 2 }],
      }).success,
    ).toBe(true)
  })

  it('requires phaseRef exactly for milestone budgets', () => {
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        budgetDefaults: [{ scope: 'milestone', hours: 2 }],
      }).success,
    ).toBe(false)
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        budgetDefaults: [
          { scope: 'project', hours: 2, phaseRef: 'phase-a' },
        ],
      }).success,
    ).toBe(false)
  })

  it('requires fixedFeeAmount for fixed-fee billing', () => {
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        project: { billingMethod: 'fixed-fee' },
      }).success,
    ).toBe(false)
    expect(
      templateDefinitionSchema.safeParse({
        schemaVersion: 1,
        project: { billingMethod: 'fixed-fee', fixedFeeAmount: 1000 },
      }).success,
    ).toBe(true)
  })
})

describe('template request schemas', () => {
  it('creates a template with key, name, and definition', () => {
    const parsed = createTemplateBodySchema.safeParse({
      key: 'sprint-pack',
      name: 'Sprint pack',
      definition: MINIMAL_DEFINITION,
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects template updates with no fields', () => {
    expect(updateTemplateBodySchema.safeParse({}).success).toBe(false)
  })

  it('requires a start date for preview and instantiate', () => {
    expect(
      previewTemplateBodySchema.safeParse({ startDate: 100 }).success,
    ).toBe(true)
    expect(
      instantiateTemplateBodySchema.safeParse({ name: 'X', startDate: 100 })
        .success,
    ).toBe(true)
    expect(
      instantiateTemplateBodySchema.safeParse({ name: 'X' }).success,
    ).toBe(false)
  })

  it('allows clones without a start date and templates without a name', () => {
    expect(
      cloneProjectBodySchema.safeParse({ name: 'Copy', startDate: null })
        .success,
    ).toBe(true)
    expect(
      saveAsTemplateBodySchema.safeParse({ key: 'copy-pack' }).success,
    ).toBe(true)
  })
})
