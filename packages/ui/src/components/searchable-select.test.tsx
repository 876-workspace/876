import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  SearchableSelect,
  type SearchableSelectOption,
} from './searchable-select'

/**
 * `userEvent.click` sends a full pointer sequence, and in jsdom the trigger
 * intermittently reads that as open-then-close. A plain click event opens the
 * popup deterministically; the `waitFor` makes a genuine failure to open show
 * up here rather than as a confusing "element not found" further down.
 */
async function openPopup(): Promise<void> {
  const trigger = screen.getByRole('combobox')
  fireEvent.click(trigger)
  await waitFor(() =>
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  )
}

const COUNTRIES: SearchableSelectOption[] = [
  { value: 'BB', label: 'Barbados' },
  { value: 'JM', label: 'Jamaica' },
  { value: 'TT', label: 'Trinidad and Tobago' },
  { value: 'US', label: 'United States' },
]

describe('SearchableSelect', () => {
  describe('trigger label', () => {
    it('shows the selected option label rather than its value', () => {
      render(
        <SearchableSelect
          options={COUNTRIES}
          value="BB"
          onValueChange={vi.fn()}
        />
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Barbados')
      expect(trigger).not.toHaveTextContent('BB')
    })

    it('shows the placeholder when nothing is selected', () => {
      render(
        <SearchableSelect
          options={COUNTRIES}
          value=""
          onValueChange={vi.fn()}
          placeholder="Select a country"
        />
      )

      expect(screen.getByRole('combobox')).toHaveTextContent('Select a country')
    })
  })

  describe('search', () => {
    it('filters the list to options matching the typed query', async () => {
      const user = userEvent.setup()
      render(
        <SearchableSelect
          options={COUNTRIES}
          value=""
          onValueChange={vi.fn()}
          searchPlaceholder="Search countries…"
        />
      )

      await openPopup()
      await user.type(screen.getByPlaceholderText('Search countries…'), 'jam')

      expect(screen.getByRole('option', { name: 'Jamaica' })).toBeVisible()
      expect(
        screen.queryByRole('option', { name: 'Barbados' })
      ).not.toBeInTheDocument()
    })

    it('reports the option value, not its label, when one is chosen', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(
        <SearchableSelect
          options={COUNTRIES}
          value=""
          onValueChange={onValueChange}
        />
      )

      await openPopup()
      await user.click(
        await screen.findByRole('option', { name: 'Trinidad and Tobago' })
      )

      expect(onValueChange).toHaveBeenCalledTimes(1)
      expect(onValueChange).toHaveBeenCalledWith('TT')
    })

    it('shows the empty message when nothing matches', async () => {
      const user = userEvent.setup()
      render(
        <SearchableSelect
          options={COUNTRIES}
          value=""
          onValueChange={vi.fn()}
          searchPlaceholder="Search countries…"
          emptyMessage="No country matches that search."
        />
      )

      await openPopup()
      await user.type(screen.getByPlaceholderText('Search countries…'), 'zzzzz')

      expect(screen.getByText('No country matches that search.')).toBeVisible()
    })
  })
})
