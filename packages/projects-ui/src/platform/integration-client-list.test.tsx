// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { IntegrationClientList } from './integration-client-list'
import type { IntegrationClient } from './types'

function makeClient(overrides?: Partial<IntegrationClient>): IntegrationClient {
  return {
    object: 'projects.integration-client',
    id: 'icl_1',
    name: 'CI bot',
    scopes: ['projects:read', 'time:read'],
    lastUsedAt: Date.UTC(2026, 2, 4) / 1000,
    revokedAt: null,
    createdAt: Date.UTC(2026, 1, 1) / 1000,
    ...overrides,
  }
}

describe('IntegrationClientList', () => {
  afterEach(cleanup)

  it('renders the client name', () => {
    render(
      <IntegrationClientList clients={[makeClient()]} revokeActionBase="/clients" canEdit />
    )
    expect(screen.getByText('CI bot')).toBeInTheDocument()
  })

  it('renders scope badges', () => {
    render(
      <IntegrationClientList clients={[makeClient()]} revokeActionBase="/clients" canEdit />
    )
    expect(screen.getByText('projects:read')).toBeInTheDocument()
    expect(screen.getByText('time:read')).toBeInTheDocument()
  })

  it('renders the last-used day', () => {
    render(
      <IntegrationClientList clients={[makeClient()]} revokeActionBase="/clients" />
    )
    expect(screen.getByText('Mar 4, 2026')).toBeInTheDocument()
  })

  it('renders a dash when never used', () => {
    render(
      <IntegrationClientList
        clients={[makeClient({ lastUsedAt: null })]}
        revokeActionBase="/clients"
      />
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('badges a revoked client and hides the form', () => {
    render(
      <IntegrationClientList
        clients={[makeClient({ revokedAt: Date.UTC(2026, 3, 1) / 1000 })]}
        revokeActionBase="/clients"
        canEdit
      />
    )
    expect(screen.getByText('Revoked')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
  })

  it('posts the revoke form to the trimmed base with the encoded id', () => {
    render(
      <IntegrationClientList
        clients={[makeClient({ id: 'icl 1' })]}
        revokeActionBase="/clients/"
        canEdit
      />
    )
    const form = document.querySelector('form')
    expect(form?.getAttribute('action')).toBe('/clients/icl%201')
  })

  it('hides the revoke form without canEdit', () => {
    render(<IntegrationClientList clients={[makeClient()]} revokeActionBase="/clients" />)
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
  })

  it('renders the empty state', () => {
    render(<IntegrationClientList clients={[]} revokeActionBase="/clients" />)
    expect(screen.getByText('No integration clients yet')).toBeInTheDocument()
  })
})
