import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomerContactsPanel } from './customer-contacts-panel'

const contact = (overrides = {}) => ({
  object: 'contact' as const,
  id: 'contact_1',
  userId: null,
  salutation: 'Dr.',
  firstName: 'Ava',
  lastName: 'Stone',
  email: 'ava@example.com',
  workPhone: '+15551234',
  mobilePhone: '+15555678',
  avatar: null,
  isPrimary: false,
  coreSyncedAt: null,
  ...overrides,
})
const props = (overrides = {}) => ({
  state: {
    status: 'ready' as const,
    data: [
      contact(),
      contact({ id: 'contact_2', firstName: 'Sam', isPrimary: true }),
    ],
  },
  addHref: '/customers/cus_1/contacts/new',
  editHref: (id: string) => `/customers/cus_1/contacts/${id}/edit`,
  canManage: true,
  ...overrides,
})

describe('CustomerContactsPanel', () => {
  it('renders several contacts with their secondary details', () => {
    render(<CustomerContactsPanel {...props()} />)
    expect(screen.getByText('Dr. Ava Stone')).toBeVisible()
    expect(screen.getByText('Dr. Sam Stone')).toBeVisible()
    expect(
      screen.getAllByText('ava@example.com · +15551234 · +15555678')
    ).toHaveLength(2)
  })
  it('renders a primary badge only for primary contacts', () => {
    render(<CustomerContactsPanel {...props()} />)
    expect(screen.getAllByText('Primary')).toHaveLength(1)
  })
  it('renders the short empty line', () => {
    render(<CustomerContactsPanel {...props({ state: { status: 'empty' } })} />)
    expect(screen.getByText('No contacts yet.')).toBeVisible()
    expect(screen.queryByText('Ava')).not.toBeInTheDocument()
  })
  it('renders an error code and message', () => {
    render(
      <CustomerContactsPanel
        {...props({
          state: {
            status: 'error',
            error: {
              code: 'billing/unavailable',
              message: 'Contacts are unavailable.',
            },
          },
        })}
      />
    )
    expect(screen.getByText('Contacts are unavailable.')).toBeVisible()
    expect(screen.getByText('Code: billing/unavailable')).toBeVisible()
  })
  it('hides add and row menus when management is unavailable', () => {
    render(<CustomerContactsPanel {...props({ canManage: false })} />)
    expect(screen.queryByText('+ Add')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Actions for/)).not.toBeInTheDocument()
  })
  it('uses the href returned by editHref for the edit link', async () => {
    const user = userEvent.setup()
    const editHref = vi.fn((id: string) => `/edit/${id}`)
    render(<CustomerContactsPanel {...props({ editHref })} />)
    await user.click(screen.getAllByLabelText(/Actions for/)[0]!)
    const link = await screen.findByRole('menuitem', { name: 'Edit' })
    expect(editHref).toHaveBeenCalledWith('contact_1')
    expect(link).toHaveAttribute('href', '/edit/contact_1')
  })
  it('calls onDelete with the selected contact id', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<CustomerContactsPanel {...props({ onDelete })} />)
    await user.click(screen.getAllByLabelText(/Actions for/)[0]!)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith('contact_1')
  })
  it('falls back to email when a contact has no name', () => {
    render(
      <CustomerContactsPanel
        {...props({
          state: {
            status: 'ready',
            data: [
              contact({
                salutation: null,
                firstName: null,
                lastName: null,
                email: 'fallback@example.com',
              }),
            ],
          },
        })}
      />
    )
    expect(screen.getByText('fallback@example.com')).toBeVisible()
  })
  it('falls back to Unnamed contact when a contact has neither name nor email', () => {
    render(
      <CustomerContactsPanel
        {...props({
          state: {
            status: 'ready',
            data: [
              contact({
                salutation: null,
                firstName: null,
                lastName: null,
                email: null,
              }),
            ],
          },
        })}
      />
    )
    expect(screen.getByText('Unnamed contact')).toBeVisible()
  })
})
