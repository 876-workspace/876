import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ context: vi.fn(), hasPermission: vi.fn(), tasks: vi.fn(), events: vi.fn() }))

vi.mock('@/lib/auth/billing-context', () => ({ getWorkspaceContext: mocks.context, hasPermission: mocks.hasPermission }))
vi.mock('@/lib/services/crm', () => ({ getCrm: () => ({ requestTasks: { list: mocks.tasks }, requestEvents: { list: mocks.events } }) }))

import { GET as getEvents } from './[requestId]/events/route'
import { GET as getTasks } from './[requestId]/tasks/route'

const route = { params: Promise.resolve({ requestId: 'req_1' }) } as never
const context = { orgId: 'org_1', userId: 'usr_1' }
const taskList = { object: 'list', data: [], has_more: false, total_count: 0, url: '/tasks' }
const eventList = { object: 'list', data: [], has_more: false, total_count: 0, url: '/events' }

describe('Billing request task and activity routes', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.context.mockResolvedValue(context); mocks.hasPermission.mockReturnValue(true) })

  it('returns the full successful task envelope', async () => {
    const result = { data: taskList, error: null }; mocks.tasks.mockResolvedValue(result)
    const response = await getTasks(new Request('http://billing.test/'), route)
    expect(response.status).toBe(200); expect(await response.json()).toEqual(result)
    expect(mocks.tasks).toHaveBeenCalledTimes(1); expect(mocks.tasks).toHaveBeenCalledWith('org_1', 'req_1')
  })
  it('returns a forbidden task response without calling CRM', async () => {
    mocks.hasPermission.mockReturnValue(false)
    const response = await getTasks(new Request('http://billing.test/'), route)
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } }); expect(mocks.tasks).not.toHaveBeenCalled()
  })
  it('renders a CRM task failure as a 502 value envelope', async () => {
    const result = { data: null, error: { code: 'crm/unavailable', message: 'CRM is unavailable.' } }; mocks.tasks.mockResolvedValue(result)
    const response = await getTasks(new Request('http://billing.test/'), route)
    expect(response.status).toBe(502); expect(await response.json()).toEqual(result); expect(mocks.tasks).toHaveBeenCalledWith('org_1', 'req_1')
  })
  it('returns the full successful activity envelope', async () => {
    const result = { data: eventList, error: null }; mocks.events.mockResolvedValue(result)
    const response = await getEvents(new Request('http://billing.test/'), route)
    expect(response.status).toBe(200); expect(await response.json()).toEqual(result)
    expect(mocks.events).toHaveBeenCalledTimes(1); expect(mocks.events).toHaveBeenCalledWith('org_1', 'req_1')
  })
  it('returns a forbidden activity response without calling CRM', async () => {
    mocks.hasPermission.mockReturnValue(false)
    const response = await getEvents(new Request('http://billing.test/'), route)
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } }); expect(mocks.events).not.toHaveBeenCalled()
  })
  it('renders a CRM activity failure as a 502 value envelope', async () => {
    const result = { data: null, error: { code: 'crm/unavailable', message: 'CRM is unavailable.' } }; mocks.events.mockResolvedValue(result)
    const response = await getEvents(new Request('http://billing.test/'), route)
    expect(response.status).toBe(502); expect(await response.json()).toEqual(result); expect(mocks.events).toHaveBeenCalledWith('org_1', 'req_1')
  })
})
