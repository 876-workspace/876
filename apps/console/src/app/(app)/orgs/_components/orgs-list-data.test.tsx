// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  search: vi.fn(),
  subscriptions: vi.fn(),
}))

vi.mock('@/lib/services/platform', () => ({
  platform: { organizations: { list: mocks.list, search: mocks.search } },
}))
vi.mock('@/lib/services/workspace', () => ({
  workspace: {
    organizations: { subscriptions: { list: mocks.subscriptions } },
  },
}))
vi.mock('./orgs-list', () => ({
  OrgsList: (props: { orgs: { id: string }[] }) => (
    <div data-testid="orgs-list">{props.orgs.map((org) => org.id)}</div>
  ),
}))

import { OrgsListData } from './orgs-list-data'

const org = { id: 'org_1', object: 'organization' }

function successfulList() {
  mocks.list.mockResolvedValue({ data: { data: [org], has_more: true } })
  mocks.subscriptions.mockResolvedValue({ data: { data: [] } })
}

describe('OrgsListData', () => {
  it('threads status and forward cursor into the directory list', async () => {
    successfulList()
    render(await OrgsListData({ after: 'org_10', status: 'archived' }))
    expect(mocks.list).toHaveBeenCalledWith({
      limit: 25,
      startingAfter: 'org_10',
      endingBefore: undefined,
      status: 'archived',
    })
  })

  it('threads the backward cursor into the directory list', async () => {
    successfulList()
    render(await OrgsListData({ before: 'org_20' }))
    expect(mocks.list).toHaveBeenCalledWith({
      limit: 25,
      startingAfter: undefined,
      endingBefore: 'org_20',
      status: undefined,
    })
  })

  it('threads search and status into the search endpoint', async () => {
    mocks.search.mockResolvedValue({ data: { data: [org] } })
    mocks.subscriptions.mockResolvedValue({ data: { data: [] } })
    render(await OrgsListData({ q: 'acme', status: 'active' }))
    expect(mocks.search).toHaveBeenCalledWith({
      query: 'acme',
      limit: 50,
      status: 'active',
    })
  })

  it('enriches only the organizations returned by the primary list', async () => {
    successfulList()
    render(await OrgsListData({}))
    expect(mocks.subscriptions).toHaveBeenCalledWith({
      organizationIds: ['org_1'],
    })
  })

  it('shows a visible notice when subscriptions cannot be enriched', async () => {
    mocks.list.mockResolvedValue({ data: { data: [org], has_more: false } })
    mocks.subscriptions.mockResolvedValue({
      error: {
        message: 'subscription service unavailable',
        code: 'unavailable',
      },
    })
    render(await OrgsListData({}))
    expect(
      screen.getByText('Organization subscriptions could not be loaded')
    ).toBeInTheDocument()
  })
})
