import { describe, expect, it } from 'vitest'

import { getWorkStructurePreset, workStructurePresets } from '../presets.js'

describe('workStructurePresets catalog', () => {
  it('ships exactly the three documented presets', () => {
    expect(workStructurePresets.map((preset) => preset.key)).toEqual([
      'software-development',
      'business-operations',
      'general',
    ])
  })

  it('gives every preset exactly one default work item type', () => {
    for (const preset of workStructurePresets) {
      const defaults = preset.workItemTypes.filter((type) => type.isDefault)
      expect(defaults).toHaveLength(1)
    }
  })

  it('gives every preset exactly one default workflow state', () => {
    for (const preset of workStructurePresets) {
      const defaults = preset.workflowStates.filter((state) => state.isDefault)
      expect(defaults).toHaveLength(1)
    }
  })

  it('keeps preset positions gapless from zero within each family', () => {
    for (const preset of workStructurePresets) {
      const typePositions = preset.workItemTypes
        .map((type) => type.position)
        .sort((a, b) => a - b)
      const statePositions = preset.workflowStates
        .map((state) => state.position)
        .sort((a, b) => a - b)
      expect(typePositions).toEqual(
        preset.workItemTypes.map((_, index) => index)
      )
      expect(statePositions).toEqual(
        preset.workflowStates.map((_, index) => index)
      )
    }
  })

  it('keeps every state key kebab-case and every category on the platform set', () => {
    const categories = new Set([
      'backlog',
      'unstarted',
      'started',
      'completed',
      'canceled',
    ])
    for (const preset of workStructurePresets) {
      for (const state of preset.workflowStates) {
        expect(state.key).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
        expect(categories.has(state.category)).toBe(true)
      }
    }
  })
})

describe('software-development preset', () => {
  it('seeds the legacy status keys so existing rows stay valid', () => {
    const preset = getWorkStructurePreset('software-development')

    expect(preset?.workflowStates.map((state) => state.key)).toEqual([
      'backlog',
      'todo',
      'in-progress',
      'in-review',
      'done',
      'canceled',
    ])
  })

  it('maps legacy keys onto categories the board and metrics can read', () => {
    const preset = getWorkStructurePreset('software-development')
    const byKey = new Map(
      preset?.workflowStates.map((state) => [state.key, state.category])
    )

    expect(byKey.get('backlog')).toBe('backlog')
    expect(byKey.get('todo')).toBe('unstarted')
    expect(byKey.get('in-progress')).toBe('started')
    expect(byKey.get('in-review')).toBe('started')
    expect(byKey.get('done')).toBe('completed')
    expect(byKey.get('canceled')).toBe('canceled')
  })

  it('defaults new issues to the task type in the todo state', () => {
    const preset = getWorkStructurePreset('software-development')

    expect(preset?.workItemTypes.find((type) => type.isDefault)?.key).toBe(
      'task'
    )
    expect(preset?.workflowStates.find((state) => state.isDefault)?.key).toBe(
      'todo'
    )
  })

  it('places subtasks below and epics above standard items', () => {
    const preset = getWorkStructurePreset('software-development')
    const byKey = new Map(
      preset?.workItemTypes.map((type) => [type.key, type.hierarchyLevel])
    )

    expect(byKey.get('subtask')).toBe(0)
    expect(byKey.get('task')).toBe(1)
    expect(byKey.get('bug')).toBe(1)
    expect(byKey.get('epic')).toBe(2)
  })
})

describe('business-operations preset', () => {
  it('renames states for business tracking while keeping the same keys', () => {
    const preset = getWorkStructurePreset('business-operations')
    const byKey = new Map(
      preset?.workflowStates.map((state) => [state.key, state.name])
    )

    expect(byKey.get('todo')).toBe('Not started')
    expect(byKey.get('done')).toBe('Complete')
  })

  it('keeps renamed states rolling up to the same categories', () => {
    const preset = getWorkStructurePreset('business-operations')
    const byKey = new Map(
      preset?.workflowStates.map((state) => [state.key, state.category])
    )

    expect(byKey.get('todo')).toBe('unstarted')
    expect(byKey.get('done')).toBe('completed')
  })

  it('tracks initiatives above tasks instead of software epics', () => {
    const preset = getWorkStructurePreset('business-operations')

    expect(preset?.workItemTypes.map((type) => type.key)).toEqual([
      'task',
      'initiative',
    ])
  })
})

describe('getWorkStructurePreset', () => {
  it('returns the general preset by key', () => {
    expect(getWorkStructurePreset('general')?.name).toBe('General')
  })

  it('returns null for an unknown preset key', () => {
    expect(getWorkStructurePreset('marketing')).toBeNull()
    expect(getWorkStructurePreset('')).toBeNull()
  })

  it('names every preset for display', () => {
    for (const preset of workStructurePresets)
      expect(preset.name.trim().length).toBeGreaterThan(0)
  })
})
