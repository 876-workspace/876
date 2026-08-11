import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  SearchableSelect,
  type SearchableSelectOption,
} from './searchable-select'

async function openPopup(): Promise<void> {
  const trigger = screen.getByRole('combobox')
  fireEvent.click(trigger)
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
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

  describe('key and leadingLabel', () => {
    it('renders options that share a value when given distinct keys', async () => {
      const options: SearchableSelectOption[] = [
        { key: 'JM', value: '+1', label: 'Jamaica', leadingLabel: '+1' },
        { key: 'BB', value: '+1', label: 'Barbados', leadingLabel: '+1' },
      ]
      render(<SearchableSelect options={options} value="" onValueChange={() => {}} />)
      await openPopup()
      expect(screen.getByRole('option', { name: /Jamaica/ })).toBeVisible()
      expect(screen.getByRole('option', { name: /Barbados/ })).toBeVisible()
    })

    it('renders the leadingLabel in its own column', async () => {
      const options: SearchableSelectOption[] = [
        { value: 'JM', label: 'Jamaica', leadingLabel: '+1' },
        { value: 'CU', label: 'Cuba', leadingLabel: '+53' },
      ]
      render(<SearchableSelect options={options} value="" onValueChange={() => {}} />)
      await openPopup()
      expect(screen.getByText('+1')).toBeVisible()
      expect(screen.getByText('+53')).toBeVisible()
      expect(screen.getByRole('option', { name: /Jamaica/ })).toHaveTextContent('Jamaica')
    })

    it('is disabled when the disabled prop is set', () => {
      render(<SearchableSelect options={COUNTRIES} value="" onValueChange={() => {}} disabled />)
      const trigger = screen.getByRole('combobox')
      expect(trigger.hasAttribute('disabled') || trigger.getAttribute('aria-disabled') === 'true' || trigger.hasAttribute('data-disabled')).toBe(true)
    })
  })
})
