import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  automationSubjectTypeSchema,
  automationTriggerSchema,
} from '../../automation/automation.schemas.js'
import { triggerSubjectType } from '../../automation/automation.subjects.js'

const { customModules, finance, issues, time, workStructure } = vi.hoisted(() => ({
  customModules: { retrieveRecordForAutomation: vi.fn() },
  finance: { retrieveBudget: vi.fn() },
  issues: { retrieve: vi.fn() },
  time: { retrieveTimeEntry: vi.fn() },
  workStructure: { retrieveMilestone: vi.fn() },
}))

vi.mock('../index.js', () => customModules)
vi.mock('../../finance/index.js', () => finance)
vi.mock('../../issues/index.js', () => issues)
vi.mock('../../time/index.js', () => time)
vi.mock('../../work-structure/index.js', () => workStructure)

const subjects = await import('../../automation/automation.subjects.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('custom record automation triggers', () => {
  it('accepts the created trigger', () => {
    expect(automationTriggerSchema.parse('custom-record.created')).toBe('custom-record.created')
  })

  it('accepts the updated trigger', () => {
    expect(automationTriggerSchema.parse('custom-record.updated')).toBe('custom-record.updated')
  })

  it('accepts the status-changed trigger', () => {
    expect(automationTriggerSchema.parse('custom-record.status-changed')).toBe('custom-record.status-changed')
  })

  it('accepts the custom-record subject type', () => {
    expect(automationSubjectTypeSchema.parse('custom-record')).toBe('custom-record')
  })

  it('maps created to the custom-record subject', () => {
    expect(triggerSubjectType('custom-record.created')).toBe('custom-record')
  })

  it('maps updated to the custom-record subject', () => {
    expect(triggerSubjectType('custom-record.updated')).toBe('custom-record')
  })

  it('maps status-changed to the custom-record subject', () => {
    expect(triggerSubjectType('custom-record.status-changed')).toBe('custom-record')
  })
})

describe('custom record subject snapshots', () => {
  it('builds layout values from the record', async () => {
    customModules.retrieveRecordForAutomation.mockResolvedValue({
      data: {
        object: 'projects.custom-record',
        id: 'cmodr_1',
        moduleId: 'cmod_1',
        moduleKey: 'risk-log',
        projectId: 'prj_1',
        title: 'Risk one',
        statusKey: 'triage',
        fields: { severity: 'high' },
        createdBy: null,
        updatedBy: null,
        createdAt: 1,
        updatedAt: 1,
      },
      error: null,
    })
    const result = await subjects.buildSubjectSnapshot('org_1', 'custom-record', 'cmodr_1')
    expect(result.error).toBeNull()
    expect(result.snapshot?.subjectId).toBe('cmodr_1')
    expect(result.snapshot?.projectId).toBe('prj_1')
    expect(result.snapshot?.values.title).toBe('Risk one')
    expect(result.snapshot?.values.state).toBe('triage')
    expect(result.snapshot?.values['cf:severity']).toBe('high')
  })

  it('reports missing record subjects', async () => {
    const { getError } = await import('../../../http/errors.js')
    customModules.retrieveRecordForAutomation.mockResolvedValue({
      data: null,
      error: getError('projects/automation-subject-not-found'),
    })
    const result = await subjects.buildSubjectSnapshot('org_1', 'custom-record', 'cmodr_9')
    expect(result.snapshot).toBeNull()
    expect(result.error?.code).toBe('projects/automation-subject-not-found')
  })
})
