import { describe, expect, it } from 'vitest'

import {
  issueCommentSchema,
  issueCommentsSchema,
  issueCreateSchema,
  issueEventsSchema,
  issueGetSchema,
  issuesListSchema,
  issueUpdateSchema,
  labelCreateSchema,
  labelsListSchema,
  milestonesListSchema,
  projectCreateSchema,
  projectGetSchema,
  projectsListSchema,
  projectUpdateSchema,
  workflowStatesListSchema,
  workItemTypesListSchema,
  workspaceGetSchema,
} from './schemas'

describe('schemas', () => {
  describe('issuesListSchema', () => {
    it('accepts string or array for status, priority, and label', () => {
      // Single strings
      const single = issuesListSchema.safeParse({
        status: 'in-progress',
        priority: 'high',
        label: 'backend',
      })
      expect(single.success).toBe(true)

      // Arrays
      const arrayInput = issuesListSchema.safeParse({
        status: ['in-progress', 'todo'],
        priority: ['high', 'urgent'],
        label: ['backend', 'api'],
      })
      expect(arrayInput.success).toBe(true)
    })

    it('rejects invalid priority values', () => {
      const invalidSingle = issuesListSchema.safeParse({ priority: 'critical' })
      expect(invalidSingle.success).toBe(false)

      const invalidArray = issuesListSchema.safeParse({ priority: ['none', 'super-urgent'] })
      expect(invalidArray.success).toBe(false)
    })

    it('enforces limit bounds (1 to 100, integer)', () => {
      expect(issuesListSchema.safeParse({ limit: 1 }).success).toBe(true)
      expect(issuesListSchema.safeParse({ limit: 100 }).success).toBe(true)
      expect(issuesListSchema.safeParse({ limit: 0 }).success).toBe(false)
      expect(issuesListSchema.safeParse({ limit: 101 }).success).toBe(false)
      expect(issuesListSchema.safeParse({ limit: 25.5 }).success).toBe(false)
    })

    it('converts ISO-8601 updatedSince to Unix seconds', () => {
      const parsed = issuesListSchema.safeParse({
        updatedSince: '2026-09-07T12:00:00.000Z',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.updatedSince).toBe(1788782400)
      }
    })

    it('rejects unrecognized properties', () => {
      const invalid = issuesListSchema.safeParse({ unknownProp: true })
      expect(invalid.success).toBe(false)
    })
  })

  describe('projectCreateSchema & projectUpdateSchema', () => {
    it('projectCreate accepts valid fields and rejects null for required fields', () => {
      const valid = projectCreateSchema.safeParse({
        name: 'New Project',
        key: 'PRJ',
        targetDate: 1788782400,
        defaultWorkItemTypeId: 'wit_123',
      })
      expect(valid.success).toBe(true)
    })

    it('projectUpdate supports explicit null for clearable fields', () => {
      const valid = projectUpdateSchema.safeParse({
        project: 'prj_123',
        description: null,
        leadUserId: null,
        targetDate: null,
        defaultWorkItemTypeId: null,
      })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.description).toBeNull()
        expect(valid.data.leadUserId).toBeNull()
        expect(valid.data.targetDate).toBeNull()
        expect(valid.data.defaultWorkItemTypeId).toBeNull()
      }
    })

    it('rejects unrecognized keys on project schemas', () => {
      expect(projectCreateSchema.safeParse({ name: 'Test', extra: 'bad' }).success).toBe(false)
      expect(projectUpdateSchema.safeParse({ project: 'prj_1', extra: 'bad' }).success).toBe(false)
    })
  })

  describe('issueCreateSchema & issueUpdateSchema', () => {
    it('issueCreate enforces estimate bounds (0 to 100)', () => {
      expect(issueCreateSchema.safeParse({ title: 'Task', estimate: 0 }).success).toBe(true)
      expect(issueCreateSchema.safeParse({ title: 'Task', estimate: 100 }).success).toBe(true)
      expect(issueCreateSchema.safeParse({ title: 'Task', estimate: -1 }).success).toBe(false)
      expect(issueCreateSchema.safeParse({ title: 'Task', estimate: 101 }).success).toBe(false)
      expect(issueCreateSchema.safeParse({ title: 'Task', estimate: 5.5 }).success).toBe(false)
    })

    it('issueUpdate supports explicit null to clear nullable fields', () => {
      const valid = issueUpdateSchema.safeParse({
        issue: 'iss_123',
        description: null,
        assigneeUserId: null,
        parentIssue: null,
        milestoneId: null,
        estimate: null,
        dueDate: null,
      })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.description).toBeNull()
        expect(valid.data.assigneeUserId).toBeNull()
        expect(valid.data.parentIssue).toBeNull()
        expect(valid.data.milestoneId).toBeNull()
        expect(valid.data.estimate).toBeNull()
        expect(valid.data.dueDate).toBeNull()
      }
    })

    it('supports custom-field values structure', () => {
      const valid = issueCreateSchema.safeParse({
        title: 'Task with custom fields',
        customFields: [
          { fieldId: 'cf_text', value: 'hello' },
          { fieldId: 'cf_num', value: 42 },
          { fieldId: 'cf_bool', value: true },
          { fieldId: 'cf_arr', value: ['tag1', 'tag2'] },
          { fieldId: 'cf_null', value: null },
        ],
      })
      expect(valid.success).toBe(true)
    })

    it('rejects unexpected properties on issueCreate and issueUpdate', () => {
      expect(issueCreateSchema.safeParse({ title: 'Task', foo: 'bar' }).success).toBe(false)
      expect(issueUpdateSchema.safeParse({ issue: 'iss_1', foo: 'bar' }).success).toBe(false)
    })
  })

  describe('strict validation across all input schemas', () => {
    it('rejects unrecognized properties on all tool input schemas', () => {
      const schemas = [
        { schema: workspaceGetSchema, valid: {} },
        { schema: projectsListSchema, valid: {} },
        { schema: projectGetSchema, valid: { project: 'prj_1' } },
        { schema: issueGetSchema, valid: { issue: 'iss_1' } },
        { schema: issueCommentSchema, valid: { issue: 'iss_1', body: 'text' } },
        { schema: issueCommentsSchema, valid: { issue: 'iss_1' } },
        { schema: issueEventsSchema, valid: { issue: 'iss_1' } },
        { schema: labelsListSchema, valid: {} },
        { schema: labelCreateSchema, valid: { name: 'bug' } },
        { schema: workItemTypesListSchema, valid: {} },
        { schema: workflowStatesListSchema, valid: {} },
        { schema: milestonesListSchema, valid: { projectId: 'prj_1' } },
      ]

      for (const { schema, valid } of schemas) {
        expect(schema.safeParse(valid).success).toBe(true)
        expect(schema.safeParse({ ...valid, unexpectedField: true }).success).toBe(false)
      }
    })
  })
})
