import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876ServerClient } from './server'
import { RESOURCE_MANIFEST } from './resource-manifest'

const API_KEY = '876_app_secret_test1234567890123456'

function crmOptions() {
  return {
    app: 'crm' as const,
    apiKey: API_KEY,
    services: {
      crm: {
        baseUrl: 'http://localhost:4010',
        internalKey: 'crm-internal',
      },
    },
  }
}

describe('CRM unified client surface', () => {
  it('exposes CRM customer profiles and requests with standard CRUD verbs', () => {
    const $876 = create876ServerClient(crmOptions())

    for (const resource of [$876.customerProfiles, $876.requests]) {
      expect(resource.list).toBeTypeOf('function')
      expect(resource.retrieve).toBeTypeOf('function')
      expect(resource.create).toBeTypeOf('function')
      expect(resource.update).toBeTypeOf('function')
      expect(resource.delete).toBeTypeOf('function')
    }
  })

  it('exposes CRM teams with member operations', () => {
    const $876 = create876ServerClient(crmOptions())

    expect($876.teams.list).toBeTypeOf('function')
    expect($876.teams.retrieve).toBeTypeOf('function')
    expect($876.teams.create).toBeTypeOf('function')
    expect($876.teams.update).toBeTypeOf('function')
    expect($876.teams.delete).toBeTypeOf('function')
    expect($876.teams.members.list).toBeTypeOf('function')
    expect($876.teams.members.add).toBeTypeOf('function')
    expect($876.teams.members.update).toBeTypeOf('function')
    expect($876.teams.members.remove).toBeTypeOf('function')
  })

  it('exposes CRM category, task, and reminder resources', () => {
    const $876 = create876ServerClient(crmOptions())

    expect($876.requestCategories.list).toBeTypeOf('function')
    expect($876.requestCategories.subcategories.create).toBeTypeOf('function')
    expect($876.requestTasks.list).toBeTypeOf('function')
    expect($876.requestTasks.create).toBeTypeOf('function')
    expect($876.requestReminders.list).toBeTypeOf('function')
    expect($876.requestReminders.create).toBeTypeOf('function')
  })

  it('keeps the shared customer registry distinct from CRM profiles', () => {
    const $876 = create876ServerClient(crmOptions())

    expect('customers' in $876).toBe(false)
    expect(RESOURCE_MANIFEST.customers.owner).toBe('billing')
    expect(RESOURCE_MANIFEST.customerProfiles.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.requestCategories.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.requestReminders.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.requests.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.requestTasks.owner).toBe('crm')
    expect(RESOURCE_MANIFEST.teams.owner).toBe('crm')
  })

  it('retains the core identity surface in CRM', () => {
    const $876 = create876ServerClient(crmOptions())

    expect($876.auth).toBeDefined()
    expect($876.sessions.me.retrieve).toBeTypeOf('function')
    expect($876.users.me).toBeDefined()
    expect($876.organizations).toBeDefined()
  })
})
