/** @vitest-environment jsdom */

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.searchParams,
}))

import { PackageCategoryFilter } from './package-category-filter'

function deferred<T>() {
  let resolve: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve: resolve! }
}

async function selectCategory(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  await user.click(screen.getByRole('combobox', { name: 'Category' }))
  await user.click(await screen.findByRole('option', { name }))
}

async function renderResolvedCategoryFilter() {
  const categoryOptions = Promise.resolve([
    { value: 'pcat_1', label: 'Fragile' },
  ])
  await act(async () => {
    render(<PackageCategoryFilter categoryOptions={categoryOptions} />)
    await categoryOptions
  })
}

describe('PackageCategoryFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = new URLSearchParams()
  })

  it('renders resolved category options', async () => {
    await renderResolvedCategoryFilter()

    const user = userEvent.setup({ delay: null })
    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    expect(await screen.findByRole('option', { name: 'Fragile' })).toBeVisible()
  })

  it('preserves status and removes cursors when selecting a category', async () => {
    mocks.searchParams = new URLSearchParams(
      'status=COLLECTED&after=pkg_1&before=pkg_3'
    )
    await renderResolvedCategoryFilter()

    await selectCategory(userEvent.setup({ delay: null }), 'Fragile')
    expect(mocks.push).toHaveBeenCalledWith('?status=COLLECTED&category=pcat_1')
  })

  it('removes the category when selecting All categories', async () => {
    mocks.searchParams = new URLSearchParams('status=COLLECTED&category=pcat_1')
    await renderResolvedCategoryFilter()

    await selectCategory(userEvent.setup({ delay: null }), 'All categories')
    expect(mocks.push).toHaveBeenCalledWith('?status=COLLECTED')
  })

  it('disables the identically sized fallback while options are pending', () => {
    const categoryOptions = deferred<Array<{ value: string; label: string }>>()
    render(<PackageCategoryFilter categoryOptions={categoryOptions.promise} />)

    expect(screen.getByRole('combobox', { name: 'Category' })).toBeDisabled()
    expect(screen.getByText('All categories')).toBeVisible()
  })
})
