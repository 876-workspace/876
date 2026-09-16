import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  customModuleFieldListSchema,
  customModuleFieldReportSchema,
  customModuleFieldSchema,
  customModuleLinkListSchema,
  customModuleLinkSchema,
  customModuleListSchema,
  customModuleCreatedReportSchema,
  customModuleSchema,
  customModuleStatusListSchema,
  customModuleStatusReportSchema,
  customModuleStatusSchema,
  customRecordListSchema,
  customRecordSchema,
  dashboardWidgetListSchema,
  dashboardWidgetSchema,
  deletedSchema,
} from '../types'
import { createCustomModulesResource } from './custom-modules'

describe('custom modules resource', () => {
  const resource = createCustomModulesResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists and creates modules', async () => {
    await resource.listModules('org 1')
    await resource.createModule('org 1', {
      scope: 'org',
      key: 'risk-log',
      singularName: 'Risk',
      pluralName: 'Risks',
    })
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/custom-modules', signal: undefined },
      customModuleListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/custom-modules',
        body: { scope: 'org', key: 'risk-log', singularName: 'Risk', pluralName: 'Risks' },
        signal: undefined,
      },
      customModuleSchema
    )
  })

  it('retrieves, updates, and deletes a module', async () => {
    await resource.retrieveModule('org 1', 'cmod/1')
    await resource.updateModule('org 1', 'cmod/1', { singularName: 'Hazard' })
    await resource.deleteModule('org 1', 'cmod/1')
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/custom-modules/cmod%2F1', signal: undefined },
      customModuleSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/custom-modules/cmod%2F1',
        body: { singularName: 'Hazard' },
        signal: undefined,
      },
      customModuleSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      { method: 'DELETE', path: '/v1/organizations/org%201/custom-modules/cmod%2F1', signal: undefined },
      deletedSchema
    )
  })

  it('manages fields', async () => {
    await resource.listFields('org 1', 'cmod_1')
    await resource.createField('org 1', 'cmod_1', { key: 'owner', label: 'Owner', fieldType: 'text' })
    await resource.updateField('org 1', 'cmod_1', 'cmodf_1', { label: 'Owner 2' })
    await resource.deleteField('org 1', 'cmod_1', 'cmodf_1')
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/custom-modules/cmod_1/fields', signal: undefined },
      customModuleFieldListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/fields',
        body: { key: 'owner', label: 'Owner', fieldType: 'text' },
        signal: undefined,
      },
      customModuleFieldSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/fields/cmodf_1',
        body: { label: 'Owner 2' },
        signal: undefined,
      },
      customModuleFieldSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(4, expect.anything(), expect.objectContaining({ method: 'DELETE' }), deletedSchema)
  })

  it('manages statuses including reorder', async () => {
    await resource.listStatuses('org 1', 'cmod_1')
    await resource.createStatus('org 1', 'cmod_1', { key: 'triage', label: 'Triage', category: 'open' })
    await resource.updateStatus('org 1', 'cmod_1', 'cmods_1', { label: 'Triage 2' })
    await resource.reorderStatuses('org 1', 'cmod_1', ['cmods_2', 'cmods_1'])
    await resource.deleteStatus('org 1', 'cmod_1', 'cmods_1')
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/custom-modules/cmod_1/statuses', signal: undefined },
      customModuleStatusListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/statuses',
        body: { key: 'triage', label: 'Triage', category: 'open' },
        signal: undefined,
      },
      customModuleStatusSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/statuses/reorder',
        body: { orderedIds: ['cmods_2', 'cmods_1'] },
        signal: undefined,
      },
      customModuleStatusListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(5, expect.anything(), expect.objectContaining({ method: 'DELETE' }), deletedSchema)
  })

  it('lists records with filters encoded', async () => {
    await resource.listRecords('org 1', 'cmod_1', { limit: 10, status: 'triage', q: 'risk', fieldKey: 'severity', fieldValue: 'high' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/records?limit=10&status=triage&q=risk&fieldKey=severity&fieldValue=high',
        signal: undefined,
      },
      customRecordListSchema
    )
  })

  it('creates, retrieves, updates, and deletes records', async () => {
    await resource.createRecord('org 1', 'cmod_1', { title: 'Risk one' })
    await resource.retrieveRecord('org 1', 'cmod_1', 'cmodr_1')
    await resource.updateRecord('org 1', 'cmod_1', 'cmodr_1', { title: 'Risk two' })
    await resource.deleteRecord('org 1', 'cmod_1', 'cmodr_1')
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/records',
        body: { title: 'Risk one' },
        signal: undefined,
      },
      customRecordSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/custom-modules/cmod_1/records/cmodr_1', signal: undefined },
      customRecordSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/records/cmodr_1',
        body: { title: 'Risk two' },
        signal: undefined,
      },
      customRecordSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(4, expect.anything(), expect.objectContaining({ method: 'DELETE' }), deletedSchema)
  })

  it('manages links', async () => {
    await resource.listLinks('org 1', 'cmod_1', 'cmodr_1')
    await resource.createLink('org 1', 'cmod_1', 'cmodr_1', { targetType: 'work-item', targetId: 'iss_1', relation: 'relates-to' })
    await resource.deleteLink('org 1', 'cmod_1', 'cmodr_1', 'cmodl_1')
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/custom-modules/cmod_1/records/cmodr_1/links', signal: undefined },
      customModuleLinkListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/records/cmodr_1/links',
        body: { targetType: 'work-item', targetId: 'iss_1', relation: 'relates-to' },
        signal: undefined,
      },
      customModuleLinkSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(3, expect.anything(), expect.objectContaining({ method: 'DELETE' }), deletedSchema)
  })

  it('fetches reports', async () => {
    await resource.statusReport('org 1', 'cmod_1')
    await resource.fieldReport('org 1', 'cmod_1', { fieldKey: 'severity' })
    await resource.createdReport('org 1', 'cmod_1', { from: 0, to: 10 })
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/custom-modules/cmod_1/reports/by-status', signal: undefined },
      customModuleStatusReportSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/reports/by-field?fieldKey=severity',
        signal: undefined,
      },
      customModuleFieldReportSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/custom-modules/cmod_1/reports/created?from=0&to=10',
        signal: undefined,
      },
      customModuleCreatedReportSchema
    )
  })

  it('manages dashboard widgets', async () => {
    await resource.listWidgets('org 1', { moduleId: 'cmod_1' })
    await resource.createWidget('org 1', { kind: 'record-count', moduleId: 'cmod_1' })
    await resource.updateWidget('org 1', 'dshw_1', { position: 2 })
    await resource.deleteWidget('org 1', 'dshw_1')
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { method: 'GET', path: '/v1/organizations/org%201/dashboard-widgets?moduleId=cmod_1', signal: undefined },
      dashboardWidgetListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/dashboard-widgets',
        body: { kind: 'record-count', moduleId: 'cmod_1' },
        signal: undefined,
      },
      dashboardWidgetSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      { method: 'PATCH', path: '/v1/organizations/org%201/dashboard-widgets/dshw_1', body: { position: 2 }, signal: undefined },
      dashboardWidgetSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(4, expect.anything(), expect.objectContaining({ method: 'DELETE' }), deletedSchema)
  })
})
