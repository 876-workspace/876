import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AsyncCombobox, type AsyncComboboxOption } from './async-combobox'

const CUSTOMERS: AsyncComboboxOption[] = [
  { value: 'cus_1', label: 'Alejandra Reyes', description: 'ale@example.com' },
  { value: 'cus_2', label: 'Devon Clarke', description: 'devon@example.com' },
]

function renderCombobox(
  overrides: Partial<React.ComponentProps<typeof AsyncCombobox>> = {}
) {
  const onSearch = vi.fn().mockResolvedValue(CUSTOMERS)
  const onValueChange = vi.fn()

  render(
    <AsyncCombobox
      ariaLabel="Customer"
      value=""
      onValueChange={onValueChange}
      onSearch={onSearch}
      debounceMs={0}
      {...overrides}
    />
  )

  return { onSearch, onValueChange }
}

describe('AsyncCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the box itself as a text input, not a button', () => {
    renderCombobox()

    const input = screen.getByRole('combobox', { name: 'Customer' })
    expect(input.tagName).toBe('INPUT')
  })

  it('does not search on mount', () => {
    const { onSearch } = renderCombobox()

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('does not search below the character threshold', async () => {
    const user = userEvent.setup()
    const { onSearch } = renderCombobox({ minChars: 2 })

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'a')

    await waitFor(() => expect(onSearch).not.toHaveBeenCalled())
  })

  it('searches once the threshold is reached, with the trimmed query', async () => {
    const user = userEvent.setup()
    const { onSearch } = renderCombobox({ minChars: 2 })

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'ale')

    await waitFor(() => expect(onSearch).toHaveBeenCalled())
    expect(onSearch.mock.calls.at(-1)?.[0]).toBe('ale')
  })

  it('passes an AbortSignal to the search', async () => {
    const user = userEvent.setup()
    const { onSearch } = renderCombobox()

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'ale')

    await waitFor(() => expect(onSearch).toHaveBeenCalled())
    expect(onSearch.mock.calls.at(-1)?.[1]).toBeInstanceOf(AbortSignal)
  })

  it('aborts the previous request when a newer query starts', async () => {
    const user = userEvent.setup()
    const signals: AbortSignal[] = []
    const onSearch = vi.fn((_query: string, signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<AsyncComboboxOption[]>(() => {})
    })

    render(
      <AsyncCombobox
        ariaLabel="Customer"
        value=""
        onValueChange={vi.fn()}
        onSearch={onSearch}
        debounceMs={0}
      />
    )

    const input = screen.getByRole('combobox', { name: 'Customer' })
    await user.type(input, 'al')
    await waitFor(() => expect(signals.length).toBeGreaterThan(0))
    const first = signals[0]!
    await user.type(input, 'ejandra')

    await waitFor(() => expect(signals.length).toBeGreaterThan(1))
    // Every superseded request is cancelled on the wire; only the newest
    // remains live, so a slow old response can never overwrite a newer one.
    expect(first.aborted).toBe(true)
    expect(signals.at(-1)!.aborted).toBe(false)
  })

  it('shows the returned options', async () => {
    const user = userEvent.setup()
    renderCombobox()

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'ale')

    expect(
      await screen.findByRole('option', { name: /Alejandra Reyes/ })
    ).toBeVisible()
  })

  it('reports the chosen value and option to the host', async () => {
    const user = userEvent.setup()
    const { onValueChange } = renderCombobox()

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'ale')
    await user.click(
      await screen.findByRole('option', { name: /Alejandra Reyes/ })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith('cus_1', CUSTOMERS[0])
    )
  })

  it('shows the selected label when the query is empty', () => {
    renderCombobox({ value: 'cus_1', selectedLabel: 'Alejandra Reyes' })

    expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveValue(
      'Alejandra Reyes'
    )
  })

  it('prompts for more characters before the threshold', async () => {
    const user = userEvent.setup()
    renderCombobox({ minChars: 3 })

    await user.click(screen.getByRole('combobox', { name: 'Customer' }))

    expect(
      await screen.findByText('Type 3 or more characters to search.')
    ).toBeVisible()
  })

  it('shows an inline error when the search rejects', async () => {
    const user = userEvent.setup()
    renderCombobox({
      onSearch: vi.fn().mockRejectedValue(new Error('boom')),
    })

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'ale')

    expect(await screen.findByText('Search is unavailable.')).toBeVisible()
  })

  it('shows the empty message when the server returns nothing', async () => {
    const user = userEvent.setup()
    renderCombobox({ onSearch: vi.fn().mockResolvedValue([]) })

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'zzz')

    expect(await screen.findByText('No matches found.')).toBeVisible()
  })

  it('does not re-filter server results on the client', async () => {
    const user = userEvent.setup()
    // The server is the authority: a result that does not literally contain
    // the query must still be shown, or fuzzy/alias matches disappear.
    renderCombobox({
      onSearch: vi
        .fn()
        .mockResolvedValue([{ value: 'cus_9', label: 'Zenith Holdings' }]),
    })

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'ale')

    expect(
      await screen.findByRole('option', { name: /Zenith Holdings/ })
    ).toBeVisible()
  })

  it('debounces rapid keystrokes into a single request', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { onSearch } = renderCombobox({ debounceMs: 250 })

    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'alej')
    await vi.advanceTimersByTimeAsync(300)

    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1))
    expect(onSearch.mock.calls[0]?.[0]).toBe('alej')
  })
})
