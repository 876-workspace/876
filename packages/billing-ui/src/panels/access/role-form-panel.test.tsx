/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { RoleFormPanel } from './role-form-panel'
import type { FinancePermissionSurface } from './types'

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const
const surface: FinancePermissionSurface = {
  app: 'billing',
  editable: ['billing:access', 'customers:read'],
  modules: [
    {
      key: 'customers',
      label: 'Customers',
      permissions: [{ key: 'customers:read', label: 'View' }],
    },
  ],
}
function renderForm(onCreate = vi.fn().mockResolvedValue({ error: null })) {
  return {
    user: userEvent.setup(),
    onCreate,
    ...render(
      <RoleFormPanel
        surface={surface}
        closeHref="/settings/roles"
        onCreate={onCreate}
      />
    ),
  }
}
async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Collections')
  await user.clear(screen.getByLabelText('Slug'))
  await user.type(screen.getByLabelText('Slug'), 'collections')
}

describe('RoleFormPanel', () => {
  it('derives a slug from the name', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Name'), 'Billing Specialist')
    expect(screen.getByLabelText('Slug')).toHaveValue('billing_specialist')
  })
  it('does not overwrite a user edited slug', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Name'), 'Billing')
    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'my_role')
    await user.type(screen.getByLabelText('Name'), ' Lead')
    expect(screen.getByLabelText('Slug')).toHaveValue('my_role')
  })
  it('sends exact create parameters', async () => {
    const { user, onCreate } = renderForm()
    await fillValid(user)
    await user.type(screen.getByLabelText('Description'), 'Collects payments.')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Collections',
      slug: 'collections',
      description: 'Collects payments.',
      permissions: ['billing:access'],
    })
  })
  it('does not submit an invalid slug', async () => {
    const { user, onCreate } = renderForm()
    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'not valid')
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreate).not.toHaveBeenCalled()
  })
  it('keeps values and renders a create error', async () => {
    const onCreate = vi
      .fn()
      .mockResolvedValue({
        error: { code: 'access/duplicate', message: 'Slug exists.' },
      })
    const { user } = renderForm(onCreate)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(screen.getByDisplayValue('Collections')).toBeInTheDocument()
    expect(await screen.findByText('access/duplicate')).toBeInTheDocument()
  })
  it('uses the supplied close link', () => {
    renderForm()
    expect(
      screen.getByRole('link', { name: 'Close role form' })
    ).toHaveAttribute('href', '/settings/roles')
  })
  it.each(SECURITY_INPUTS)(
    'renders security corpus name input as a value: %s',
    (value) => {
      const { onCreate } = renderForm()
      fireEvent.change(screen.getByLabelText('Name'), { target: { value } })
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(onCreate).not.toHaveBeenCalled()
    }
  )
  it.each(SECURITY_INPUTS)(
    'keeps security corpus slug input in the field: %s',
    async (value) => {
      const { user, onCreate } = renderForm()
      await user.type(screen.getByLabelText('Name'), 'Collections')
      fireEvent.change(screen.getByLabelText('Slug'), { target: { value } })
      expect(screen.getByLabelText('Slug')).toBeInTheDocument()
      expect(onCreate).not.toHaveBeenCalled()
    }
  )
  it.each(SECURITY_INPUTS)(
    'submits security corpus description only through the callback: %s',
    async (value) => {
      const { user, onCreate } = renderForm()
      await fillValid(user)
      fireEvent.change(screen.getByLabelText('Description'), {
        target: { value },
      })
      await user.click(screen.getByRole('button', { name: 'Create' }))
      expect(onCreate).toHaveBeenCalledTimes(1)
    }
  )
})
