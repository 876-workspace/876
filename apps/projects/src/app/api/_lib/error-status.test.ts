import { describe, expect, it } from 'vitest'

import { projectsErrorStatus } from './error-status'

describe('projectsErrorStatus', () => {
  it('answers missing records with not-found', () => {
    expect(projectsErrorStatus('projects/project-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/issue-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/comment-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/task-list-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/milestone-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/template-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/tenant-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/capacity-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/time-entry-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/timesheet-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/timer-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/issue-relation-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/issue-dependency-not-found')).toBe(404)
  })

  it('answers any other not-found code with not-found', () => {
    expect(projectsErrorStatus('projects/automation-rule-not-found')).toBe(404)
    expect(projectsErrorStatus('projects/webhook-endpoint-not-found')).toBe(404)
  })

  it('answers forbidden with forbidden', () => {
    expect(projectsErrorStatus('projects/time-entry-forbidden')).toBe(403)
    expect(projectsErrorStatus('projects/timesheet-forbidden')).toBe(403)
    expect(projectsErrorStatus('projects/timesheet-self-approval')).toBe(403)
    expect(projectsErrorStatus('storage/forbidden')).toBe(403)
  })

  it('answers conflicts with conflict', () => {
    expect(projectsErrorStatus('projects/time-entry-locked')).toBe(409)
    expect(projectsErrorStatus('projects/timesheet-transition-invalid')).toBe(409)
    expect(projectsErrorStatus('projects/capacity-overlap')).toBe(409)
    expect(projectsErrorStatus('projects/template-key-taken')).toBe(409)
    expect(projectsErrorStatus('projects/project-key-taken')).toBe(409)
    expect(projectsErrorStatus('projects/issue-relation-exists')).toBe(409)
    expect(projectsErrorStatus('projects/issue-dependency-exists')).toBe(409)
    expect(projectsErrorStatus('storage/upload-incomplete')).toBe(409)
    expect(projectsErrorStatus('storage/upload-expired')).toBe(409)
    expect(projectsErrorStatus('storage/upload-verification-failed')).toBe(409)
    expect(projectsErrorStatus('storage/file-not-ready')).toBe(409)
  })

  it('answers rejected input with unprocessable entity', () => {
    expect(projectsErrorStatus('projects/timesheet-note-required')).toBe(422)
    expect(projectsErrorStatus('projects/invalid-period')).toBe(422)
    expect(projectsErrorStatus('projects/invalid-request')).toBe(422)
    expect(projectsErrorStatus('projects/invalid-template-key')).toBe(422)
    expect(projectsErrorStatus('projects/invalid-project-key')).toBe(422)
    expect(projectsErrorStatus('projects/invalid-template-definition')).toBe(422)
    expect(projectsErrorStatus('projects/template-missing-references')).toBe(422)
    expect(projectsErrorStatus('projects/template-dependency-cycle')).toBe(422)
    expect(projectsErrorStatus('projects/issue-dependency-cycle')).toBe(422)
  })

  it('answers storage faults with their current status', () => {
    expect(projectsErrorStatus('storage/upload-not-found')).toBe(404)
    expect(projectsErrorStatus('storage/file-not-found')).toBe(404)
    expect(projectsErrorStatus('storage/resource-link-not-found')).toBe(404)
    expect(projectsErrorStatus('storage/file-too-large')).toBe(413)
    expect(projectsErrorStatus('storage/mime-not-allowed')).toBe(415)
    expect(projectsErrorStatus('storage/not-configured')).toBe(502)
    expect(projectsErrorStatus('storage/unauthorized')).toBe(502)
    expect(projectsErrorStatus('storage/provider-error')).toBe(502)
    expect(projectsErrorStatus('storage/route-not-found')).toBe(500)
    expect(projectsErrorStatus('projects/not-configured')).toBe(503)
  })

  it('degrades an unknown code to a bad request', () => {
    expect(projectsErrorStatus('projects/something-new')).toBe(400)
    expect(projectsErrorStatus('')).toBe(400)
  })
})
