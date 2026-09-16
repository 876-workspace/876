// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ClientGrantList } from './client-grant-list'
import type { ClientGrant } from './types'

function makeGrant(overrides?: Partial<ClientGrant>): ClientGrant {
  return {
    object: 'projects.client-grant',
    id: 'grant_1',
    projectId: 'p_1',
    userLabel: 'Client User',
    invitedAt: Date.UTC(2026, 2, 4) / 1000,
    revokedAt: null,
    ...overrides,
  }
}

describe('ClientGrantList', () => {
  afterEach(cleanup)

  it('renders the user label for each grant', () => {
    render(
      <ClientGrantList grants={[makeGrant()]} revokeActionBase="/grants" />
    )

    expect(screen.getByText('Client User')).toBeInTheDocument()
  })

  it('shows Active for a grant with revokedAt null', () => {
    render(
      <ClientGrantList grants={[makeGrant()]} revokeActionBase="/grants" />
    )

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Revoked')).not.toBeInTheDocument()
  })

  it('shows Revoked for a grant with revokedAt set including 0', () => {
    render(
      <ClientGrantList
        grants={[makeGrant({ revokedAt: 0 })]}
        revokeActionBase="/grants"
      />
    )

    expect(screen.getByText('Revoked')).toBeInTheDocument()
    expect(screen.getByText('Revoked Jan 1, 1970')).toBeInTheDocument()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
    expect(document.querySelector('form')).toBeNull()
  })

  it('renders the invited date', () => {
    render(
      <ClientGrantList grants={[makeGrant()]} revokeActionBase="/grants" />
    )

    expect(screen.getByText('Invited Mar 4, 2026')).toBeInTheDocument()
  })

  it('renders the revoked date for a revoked grant', () => {
    render(
      <ClientGrantList
        grants={[makeGrant({ revokedAt: Date.UTC(2026, 2, 6) / 1000 })]}
        revokeActionBase="/grants"
      />
    )

    expect(screen.getByText('Revoked Mar 6, 2026')).toBeInTheDocument()
  })

  it('offers a revoke form for an active grant', () => {
    render(
      <ClientGrantList grants={[makeGrant()]} revokeActionBase="/grants" />
    )

    expect(
      screen.getByRole('button', { name: 'Revoke' })
    ).toBeInTheDocument()
    const form = document.querySelector('form')
    expect(form).toHaveAttribute('action', '/grants/grant_1')
    expect(form).toHaveAttribute('method', 'post')
  })

  it('posts to the trimmed revokeActionBase with the encoded grant id', () => {
    render(
      <ClientGrantList
        grants={[makeGrant({ id: 'grant/1 2' })]}
        revokeActionBase="/grants/"
      />
    )

    expect(document.querySelector('form')).toHaveAttribute(
      'action',
      '/grants/grant%2F1%202'
    )
  })

  it('omits the revoke form for a revoked grant', () => {
    render(
      <ClientGrantList
        grants={[makeGrant({ revokedAt: Date.UTC(2026, 2, 6) / 1000 })]}
        revokeActionBase="/grants"
      />
    )

    expect(document.querySelector('form')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
  })

  it('renders the empty state', () => {
    render(<ClientGrantList grants={[]} revokeActionBase="/grants" />)

    expect(screen.getByText('No client grants yet')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders one row per grant', () => {
    render(
      <ClientGrantList
        grants={[makeGrant(), makeGrant({ id: 'grant_2', userLabel: 'Other' })]}
        revokeActionBase="/grants"
      />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
