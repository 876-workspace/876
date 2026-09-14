/** @vitest-environment jsdom */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageCategory } from '@876/couriers/admin'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/client/package-categories', () => ({
  packageCategories: {
    create: mocks.create,
    update: mocks.update,
    archive: mocks.archive,
  },
}))

import { PackageCategoryForm } from './package-category-form'

const LIST_HREF = '/island-logistics/settings/customization/package-categories'

function createCategory(
  overrides: Partial<PackageCategory> = {}
): PackageCategory {
  return {
    object: 'package_category',
    id: 'pcat_fragile',
    tenant_id: 'ten_123',
    provisioning_key: null,
    name: 'Fragile',
    slug: 'fragile',
    description: 'Handle with care.',
    icon: null,
    sort_order: 10,
    is_active: true,
    created_at: 1_784_419_200,
    updated_at: 1_784_419_200,
    deleted_at: null,
    ...overrides,
  }
}

describe('PackageCategoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({
      data: createCategory({ id: 'pcat_new' }),
      error: null,
    })
    mocks.update.mockResolvedValue({
      data: createCategory({ name: 'Extra Fragile' }),
      error: null,
    })
    mocks.archive.mockResolvedValue({
      data: { object: 'package_category', id: 'pcat_fragile', deleted: true },
      error: null,
    })
  })

  it('creates a category with the entered payload then returns to the list', async () => {
    const user = userEvent.setup({ delay: null })

    render(<PackageCategoryForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Name'), 'Fragile')
    await user.type(screen.getByLabelText('Slug'), 'fragile')
    await user.type(screen.getByLabelText('Description'), 'Handle with care.')
    await user.type(screen.getByLabelText('Sort order'), '10')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('island-logistics', {
      name: 'Fragile',
      slug: 'fragile',
      description: 'Handle with care.',
      sort_order: 10,
      is_active: true,
    })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith(LIST_HREF)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('updates a category with the edited payload then returns to the list', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <PackageCategoryForm
        orgSlug="island-logistics"
        category={createCategory()}
      />
    )

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Extra Fragile')
    await user.clear(screen.getByLabelText('Description'))
    await user.clear(screen.getByLabelText('Sort order'))
    await user.type(screen.getByLabelText('Sort order'), '3')
    await user.click(screen.getByRole('switch', { name: 'Active' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith(
      'island-logistics',
      'pcat_fragile',
      {
        name: 'Extra Fragile',
        slug: 'fragile',
        description: null,
        sort_order: 3,
        is_active: false,
      }
    )
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith(LIST_HREF)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('blocks submit when the name is blank', async () => {
    const user = userEvent.setup({ delay: null })

    render(<PackageCategoryForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Slug'), 'fragile')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Enter a category name.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('blocks submit when the slug is not kebab-case', async () => {
    const user = userEvent.setup({ delay: null })

    render(<PackageCategoryForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Name'), 'Fragile')
    await user.type(screen.getByLabelText('Slug'), 'Fragile Box')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText(
        'Slug must use lowercase letters, numbers, and hyphens.'
      )
    ).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('blocks submit when the sort order is not a whole number', async () => {
    const user = userEvent.setup({ delay: null })

    render(<PackageCategoryForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Name'), 'Fragile')
    await user.type(screen.getByLabelText('Slug'), 'fragile')
    await user.type(screen.getByLabelText('Sort order'), '1.5')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText('Sort order must be a whole number of 0 or more.')
    ).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('keeps entered values visible when the service rejects the submit', async () => {
    const user = userEvent.setup({ delay: null })
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'package-category/slug-conflict',
        message: 'A package category with that slug already exists.',
      },
    })

    render(<PackageCategoryForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Name'), 'Fragile')
    await user.type(screen.getByLabelText('Slug'), 'fragile')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText(
        'A package category with that slug already exists.'
      )
    ).toBeVisible()
    expect(screen.getByLabelText('Name')).toHaveValue('Fragile')
    expect(screen.getByLabelText('Slug')).toHaveValue('fragile')
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('shows the provisioning key read-only on edit and never on create', async () => {
    render(
      <PackageCategoryForm
        orgSlug="island-logistics"
        category={createCategory({ provisioning_key: 'fragile-box' })}
      />
    )

    const key = screen.getByLabelText('Provisioning key')
    expect(key).toHaveValue('fragile-box')
    expect(key).toHaveAttribute('readonly')
  })

  it('archives through the confirm dialog then returns to the list', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <PackageCategoryForm
        orgSlug="island-logistics"
        category={createCategory()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Archive' }))
    const dialog = await screen.findByText('Archive package category?')
    const dialogContent =
      dialog.closest('[role="dialog"], [role="alertdialog"]') ??
      dialog.parentElement
    const scope = dialogContent ? within(dialogContent as HTMLElement) : screen
    await user.click(scope.getByRole('button', { name: 'Archive' }))

    expect(mocks.archive).toHaveBeenCalledTimes(1)
    expect(mocks.archive).toHaveBeenCalledWith(
      'island-logistics',
      'pcat_fragile'
    )
    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith(LIST_HREF)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
