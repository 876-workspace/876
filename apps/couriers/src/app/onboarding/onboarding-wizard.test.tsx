/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OnboardingCatalog } from '@876/ui/onboarding'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  request: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/request', () => ({ request: mocks.request }))

import { OnboardingWizard } from './onboarding-wizard'

const orgCatalog: OnboardingCatalog = {
  object: 'onboarding_catalog',
  target_type: 'organization',
  target_key: 'core',
  country_code: 'JM',
  catalog_revision: 1,
  sections: [
    {
      key: 'business',
      title: 'Business',
      description: '',
      position: 1,
      fields: [
        {
          key: 'business_category',
          label: 'Business category',
          field_type: 'select',
          required: true,
          options: [
            { value: 'retail', label: 'Retail' },
            { value: 'logistics', label: 'Logistics' },
          ],
        },
      ],
    },
  ],
}

const appCatalog: OnboardingCatalog = {
  object: 'onboarding_catalog',
  target_type: 'application',
  target_key: 'couriers',
  country_code: 'JM',
  catalog_revision: 1,
  sections: [
    {
      key: 'setup',
      title: 'Setup',
      description: '',
      position: 1,
      fields: [
        {
          key: 'platform_name',
          label: 'Platform name',
          field_type: 'string',
          required: true,
          options: [],
        },
        {
          key: 'mailbox_prefix',
          label: 'Mailbox prefix',
          field_type: 'string',
          required: false,
          options: [],
        },
      ],
    },
  ],
}

function renderWizard(
  props: Partial<ComponentProps<typeof OnboardingWizard>> = {}
) {
  return render(
    <OnboardingWizard
      needsOrg={false}
      orgName="Kingston Couriers"
      orgCatalog={orgCatalog}
      appCatalog={appCatalog}
      initialOrgAnswers={{}}
      initialAppAnswers={{}}
      {...props}
    />
  )
}

async function advanceToSetup() {
  const user = userEvent.setup()
  renderWizard()

  await user.selectOptions(screen.getByLabelText(/Business category/), 'retail')
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByRole('heading', { name: 'Set up your workspace' })

  return user
}

async function advanceToTeam() {
  const user = await advanceToSetup()

  await user.clear(screen.getByLabelText(/Platform name/))
  await user.type(screen.getByLabelText(/Platform name/), 'Kingston Couriers')
  await user.type(screen.getByLabelText('Mailbox prefix'), 'kgn')
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByRole('heading', { name: 'Invite your team' })

  return user
}

describe('Couriers onboarding wizard', () => {
  beforeEach(() => {
    mocks.push.mockReset()
    mocks.refresh.mockReset()
    mocks.request.mockReset()
    mocks.request.mockResolvedValue({ data: {}, error: null })
  })

  it('renders step 1 with the business category select from the catalog', () => {
    renderWizard()

    expect(
      screen.getByRole('heading', { name: 'About your business' })
    ).toBeVisible()
    expect(screen.getByLabelText(/Business category/)).toBeVisible()
    expect(screen.getByRole('option', { name: 'Retail' })).toBeVisible()
  })

  it('keeps Continue disabled until the required business category is chosen', async () => {
    const user = userEvent.setup()
    renderWizard()

    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button).toBeDisabled()

    await user.selectOptions(
      screen.getByLabelText(/Business category/),
      'retail'
    )
    expect(button).toBeEnabled()
  })

  it('saves organization answers with the exact body and advances to setup', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.selectOptions(
      screen.getByLabelText(/Business category/),
      'retail'
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        '/api/manage/onboarding/answers',
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            target: 'organization',
            answers: { business_category: 'retail' },
          }),
        }
      )
    )
    expect(
      screen.getByRole('heading', { name: 'Set up your workspace' })
    ).toBeVisible()
  })

  it('prefills platform_name from orgName on step 2', async () => {
    await advanceToSetup()

    expect(screen.getByLabelText(/Platform name/)).toHaveValue(
      'Kingston Couriers'
    )
  })

  it('creates an organization for a needs-org user and prefills platform_name', async () => {
    const user = userEvent.setup()
    renderWizard({ needsOrg: true, orgName: '' })

    const button = screen.getByRole('button', { name: 'Continue' })
    expect(screen.getByLabelText('Organization name')).toBeVisible()
    expect(button).toBeDisabled()

    await user.type(
      screen.getByLabelText('Organization name'),
      'Montego Couriers'
    )
    await user.selectOptions(
      screen.getByLabelText(/Business category/),
      'logistics'
    )
    await user.click(button)

    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        '/api/manage/onboarding/organization',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Montego Couriers',
            answers: { business_category: 'logistics' },
          }),
        }
      )
    )
    expect(screen.getByLabelText(/Platform name/)).toHaveValue(
      'Montego Couriers'
    )
  })

  it('redirects an invalidated session to login instead of showing a stale-session error', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    mocks.request.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'auth/session-invalid',
        message: 'Your session is no longer valid. Please sign in again.',
      },
    })
    renderWizard({ needsOrg: true, orgName: '' })

    await user.type(
      screen.getByLabelText('Organization name'),
      'Montego Couriers'
    )
    await user.selectOptions(
      screen.getByLabelText(/Business category/),
      'logistics'
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'))
    expect(assign).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByText(
        'Your session is no longer valid. Please sign in again.'
      )
    ).not.toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('saves application answers, completes onboarding in order, and advances', async () => {
    const user = await advanceToSetup()
    mocks.request.mockClear()
    mocks.request
      .mockResolvedValueOnce({
        data: { object: 'onboarding_session' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          object: 'onboarding_completion',
          tenant_id: 'tenant_123',
          access_status: 'active',
        },
        error: null,
      })

    await user.clear(screen.getByLabelText(/Platform name/))
    await user.type(screen.getByLabelText(/Platform name/), 'Portland Express')
    await user.type(screen.getByLabelText('Mailbox prefix'), 'pdx')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() =>
      expect(mocks.request).toHaveBeenNthCalledWith(
        1,
        '/api/manage/onboarding/answers',
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            target: 'application',
            answers: {
              platform_name: 'Portland Express',
              mailbox_prefix: 'pdx',
            },
          }),
        }
      )
    )
    expect(mocks.request).toHaveBeenNthCalledWith(
      2,
      '/api/manage/onboarding/complete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }
    )
    expect(
      screen.getByRole('heading', { name: 'Invite your team' })
    ).toBeVisible()
  })

  it('keeps the user on step 2 and shows the complete error message', async () => {
    const user = await advanceToSetup()
    mocks.request.mockClear()
    mocks.request
      .mockResolvedValueOnce({
        data: { object: 'onboarding_session' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'That subdomain is already taken.' },
      })

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      await screen.findByText('That subdomain is already taken.')
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Set up your workspace' })
    ).toBeVisible()
  })

  it('skips team invites and navigates to the dashboard without an invite POST', async () => {
    const user = await advanceToTeam()
    mocks.request.mockClear()

    await user.click(screen.getByRole('button', { name: 'Skip for now' }))

    expect(mocks.request).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith('/')
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('posts team invites with the exact body', async () => {
    const user = await advanceToTeam()
    mocks.request.mockClear()
    mocks.request.mockResolvedValueOnce({
      data: {
        object: 'invite_batch',
        results: [{ email: 'ops@example.com', ok: true }],
      },
      error: null,
    })

    await user.type(screen.getByLabelText('Email 1'), 'ops@example.com')
    await user.selectOptions(screen.getByLabelText('Role'), 'admin')
    await user.click(screen.getByRole('button', { name: 'Send invites' }))

    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        '/api/manage/onboarding/invites',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            invites: [{ email: 'ops@example.com', role: 'admin' }],
          }),
        }
      )
    )
  })
})
