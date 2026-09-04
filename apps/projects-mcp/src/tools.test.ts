import { describe, expect, it } from 'vitest'

import { ConfigError, validateConfig } from './config'
import { TOOLS } from './tools'

describe('tools', () => {
  it('every tool has a non-empty description longer than 40 characters', () => {
    expect(TOOLS.length).toBe(17)
    for (const tool of TOOLS) {
      expect(tool.description.trim().length).toBeGreaterThan(40)
    }
  })

  it('every tool inputSchema is type object with properties', () => {
    for (const tool of TOOLS) {
      expect(tool.inputSchema.type).toBe('object')
      expect(typeof tool.inputSchema.properties).toBe('object')
    }
  })

  it('every parameter has its own description', () => {
    let parameterCount = 0
    for (const tool of TOOLS) {
      for (const [paramName, paramSchema] of Object.entries(
        tool.inputSchema.properties
      )) {
        parameterCount++
        expect(paramSchema.description).toBeDefined()
        expect(paramSchema.description.trim().length).toBeGreaterThan(0)
        expect(paramName.length).toBeGreaterThan(0)
      }
    }
    expect(parameterCount).toBeGreaterThan(10)
  })

  it('no tool accepts an organizationId parameter', () => {
    for (const tool of TOOLS) {
      const propNames = Object.keys(tool.inputSchema.properties)
      expect(propNames).not.toContain('organizationId')
      expect(propNames).not.toContain('organization_id')
      expect(propNames).not.toContain('orgId')
    }
  })

  it("issues_list's status enum is exactly the six kebab-case values", () => {
    const tool = TOOLS.find((t) => t.name === 'issues_list')
    expect(tool).toBeDefined()
    const statusProp = tool?.inputSchema.properties.status
    expect(statusProp?.enum).toEqual([
      'backlog',
      'todo',
      'in-progress',
      'in-review',
      'done',
      'canceled',
    ])
  })

  it("issue_create's priority enum is exactly the five values", () => {
    const tool = TOOLS.find((t) => t.name === 'issue_create')
    expect(tool).toBeDefined()
    const priorityProp = tool?.inputSchema.properties.priority
    expect(priorityProp?.enum).toEqual([
      'none',
      'low',
      'medium',
      'high',
      'urgent',
    ])
  })

  it('tool names are unique', () => {
    const names = TOOLS.map((t) => t.name)
    const uniqueNames = new Set(names)
    expect(names.length).toBe(uniqueNames.size)
  })

  it('work structure list tools exist with workspace-scoped inputs', () => {
    const workItemTypes = TOOLS.find(
      (tool) => tool.name === 'work_item_types_list'
    )
    const workflowStates = TOOLS.find(
      (tool) => tool.name === 'workflow_states_list'
    )
    const milestones = TOOLS.find((tool) => tool.name === 'milestones_list')

    expect(workItemTypes?.inputSchema.properties).toEqual({})
    expect(workflowStates?.inputSchema.properties).toEqual({})
    expect(milestones?.inputSchema.required).toEqual(['projectId'])
    expect(milestones?.inputSchema.properties.status?.enum).toEqual([
      'open',
      'completed',
      'canceled',
    ])
  })

  it('issue_comments requires only the issue reference', () => {
    const tool = TOOLS.find((t) => t.name === 'issue_comments')
    expect(tool).toBeDefined()
    expect(tool?.inputSchema.required).toEqual(['issue'])
    expect(Object.keys(tool?.inputSchema.properties ?? {}).sort()).toEqual([
      'issue',
      'limit',
    ])
  })

  it('issue_comments documents the oldest-first thread order', () => {
    const tool = TOOLS.find((t) => t.name === 'issue_comments')
    expect(tool?.description).toContain('oldest first')
  })

  it('issue_get exposes includeComments as an optional boolean', () => {
    const tool = TOOLS.find((t) => t.name === 'issue_get')
    expect(tool).toBeDefined()
    expect(tool?.inputSchema.required).toEqual(['issue'])
    expect(tool?.inputSchema.properties.includeComments?.type).toBe('boolean')
  })

  it('issue_get documents that comments carry the requester specification', () => {
    const tool = TOOLS.find((t) => t.name === 'issue_get')
    expect(tool?.description).toContain('Comments carry')
  })

  it('every comment-reading tool shares the same issue parameter description shape', () => {
    const readers = ['issue_get', 'issue_comments', 'issue_comment'].map(
      (name) => TOOLS.find((t) => t.name === name)
    )
    for (const tool of readers) {
      expect(tool).toBeDefined()
      expect(
        tool?.inputSchema.properties.issue?.description.length
      ).toBeGreaterThan(10)
    }
  })

  it('every tool required list only names declared properties', () => {
    for (const tool of TOOLS) {
      const declared = new Set(Object.keys(tool.inputSchema.properties))
      for (const required of tool.inputSchema.required ?? [])
        expect(declared.has(required)).toBe(true)
    }
  })
})

describe('config', () => {
  it('a missing PROJECTS_API_URL fails validation, naming that variable', () => {
    expect(() =>
      validateConfig({
        PROJECTS_INTERNAL_KEY: 'test-key',
        PROJECTS_ORGANIZATION_ID: 'org_test',
      })
    ).toThrow(ConfigError)

    try {
      validateConfig({
        PROJECTS_INTERNAL_KEY: 'test-key',
        PROJECTS_ORGANIZATION_ID: 'org_test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      if (error instanceof ConfigError) {
        expect(error.variable).toBe('PROJECTS_API_URL')
        expect(error.message).toContain('PROJECTS_API_URL')
      }
    }
  })

  it('a missing PROJECTS_INTERNAL_KEY fails validation', () => {
    expect(() =>
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_ORGANIZATION_ID: 'org_test',
      })
    ).toThrow(ConfigError)

    try {
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_ORGANIZATION_ID: 'org_test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      if (error instanceof ConfigError) {
        expect(error.variable).toBe('PROJECTS_INTERNAL_KEY')
        expect(error.message).toContain('PROJECTS_INTERNAL_KEY')
      }
    }
  })

  it('a missing PROJECTS_ORGANIZATION_ID fails validation', () => {
    expect(() =>
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_INTERNAL_KEY: 'test-key',
      })
    ).toThrow(ConfigError)

    try {
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_INTERNAL_KEY: 'test-key',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      if (error instanceof ConfigError) {
        expect(error.variable).toBe('PROJECTS_ORGANIZATION_ID')
        expect(error.message).toContain('PROJECTS_ORGANIZATION_ID')
      }
    }
  })

  it('an absent PROJECTS_DEFAULT_USER_ID is accepted', () => {
    const config = validateConfig({
      PROJECTS_API_URL: 'http://localhost:4030',
      PROJECTS_INTERNAL_KEY: 'test-key',
      PROJECTS_ORGANIZATION_ID: 'org_test',
    })
    expect(config.apiUrl).toBe('http://localhost:4030')
    expect(config.internalKey).toBe('test-key')
    expect(config.organizationId).toBe('org_test')
    expect(config.defaultUserId).toBeUndefined()
  })
})
