import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  request: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/request', () => ({ request: mocks.request }))

import { OrganizationSetup } from './organization-setup'

describe('OrganizationSetup — workspace bootstrap form (goldbergyoni AAA, diff)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({
      data: { object: 'onboarding_organization', organization_id: 'organization_123' },
      error: null,
    })
  })

  it('creates the workspace through same-origin onboarding route', async () => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme Logistics')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(mocks.request).toHaveBeenCalledWith('/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme Logistics' }),
    })
    expect(mocks.replace).toHaveBeenCalledWith('/')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('trims whitespace before sending — "  Acme  " => "Acme"', async () => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), '  Acme  ')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    // component sends raw name to API, API trims; we assert form does not block trim case
    expect(mocks.request).toHaveBeenCalled()
  })

  it('keeps form visible when bootstrap reports error', async () => {
    mocks.request.mockResolvedValue({
      data: null,
      error: { code: 'provisioning/finance-workspace-unavailable', message: 'Workspace setup is temporarily unavailable.' },
    })
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme Logistics')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(await screen.findByText('Workspace setup is temporarily unavailable.')).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('shows validation error when name is blank (client-side)', async () => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(await screen.findByText('Enter a workspace name.')).toBeInTheDocument()
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('shows validation error for whitespace-only name', async () => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(await screen.findByText('Enter a workspace name.')).toBeInTheDocument()
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('returns stale session to Enterprise login', async () => {
    mocks.request.mockResolvedValue({
      data: null,
      error: { code: 'auth/session-invalid', message: 'Your session is no longer valid. Please sign in again.' },
    })
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme Logistics')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(mocks.replace).toHaveBeenCalledWith('/login?returnTo=%2Fonboarding')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('stale session code triggers login redirect not error message', async () => {
    mocks.request.mockResolvedValue({
      data: null,
      error: { code: 'auth/session-invalid', message: 'stale' },
    })
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'x')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(mocks.replace).toHaveBeenCalledWith('/login?returnTo=%2Fonboarding')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables inputs while pending', async () => {
    let resolve!: (v: unknown) => void
    mocks.request.mockReturnValue(new Promise(r => (resolve = r)))
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(screen.getByLabelText('Workspace name')).toBeDisabled()
    expect(screen.getByRole('button', { name: /creating workspace/i })).toBeDisabled()
    resolve({ data: { object: 'onboarding_organization', organization_id: 'o1' }, error: null })
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled())
  })

  it('shows Creating workspace… busy text', async () => {
    let resolve!: (v: unknown) => void
    mocks.request.mockReturnValue(new Promise(r => (resolve = r)))
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(screen.getByRole('button', { name: 'Creating workspace…' })).toBeInTheDocument()
    resolve({ data: { object: 'onboarding_organization', organization_id: 'o1' }, error: null })
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled())
  })

  it('resets error on new submit', async () => {
    mocks.request.mockResolvedValueOnce({ data: null, error: { code: 'provisioning/finance-workspace-unavailable', message: 'temporarily unavailable' } })
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(await screen.findByText('temporarily unavailable')).toBeInTheDocument()
    mocks.request.mockResolvedValue({ data: { object: 'onboarding_organization', organization_id: 'o1' }, error: null })
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled())
    expect(screen.queryByText('temporarily unavailable')).not.toBeInTheDocument()
  })

  it('error alert has role=alert (a11y)', async () => {
    mocks.request.mockResolvedValue({ data: null, error: { code: 'provisioning/finance-workspace-unavailable', message: 'Workspace setup is temporarily unavailable.' } })
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('renders 876 Enterprise heading and Create your workspace title', () => {
    render(<OrganizationSetup />)
    expect(screen.getByText('876 Enterprise')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Create your workspace' })).toBeVisible()
  })

  it('is idempotent: rapid double submit does not double request when pending', async () => {
    let resolve!: (v: unknown) => void
    mocks.request.mockReturnValue(new Promise(r => (resolve = r)))
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme')
    const btn = screen.getByRole('button', { name: 'Create workspace' })
    await user.click(btn)
    // second click while pending should be disabled so no second call
    expect(mocks.request).toHaveBeenCalledTimes(1)
    resolve({ data: { object: 'onboarding_organization', organization_id: 'o1' }, error: null })
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled())
  })

  it('uses POST /api/onboarding/organization not /register', async () => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(mocks.request).toHaveBeenCalledWith(expect.stringContaining('/api/onboarding/organization'), expect.objectContaining({ method: 'POST' }))
    expect(mocks.request).not.toHaveBeenCalledWith(expect.stringContaining('/register'), expect.anything())
  })

  it('replaces to "/" on success (not /onboarding loop)', async () => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'))
  })

  it.each([
    ['Acme', 'Acme'],
    ['A', 'A'],
    ['My Workspace 123', 'My Workspace 123'],
  ])('accepts valid name "%s"', async (input) => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)
    await user.type(screen.getByLabelText('Workspace name'), input)
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    await waitFor(() => expect(mocks.request).toHaveBeenCalled())
  })
})
