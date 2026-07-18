/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@876/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode
    onValueChange: (value: string) => void
  }) => (
    <div>
      <button type="button" onClick={() => onValueChange('shipping')}>
        Choose shipping
      </button>
      <button type="button" onClick={() => onValueChange('unsupported')}>
        Choose unsupported
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => (
    <button id={id}>{children}</button>
  ),
  SelectValue: () => <span>Selected value</span>,
}))

import {
  AddressTypeSelect,
  DefaultCheckbox,
  FieldInput,
} from './address-fields'

describe('address field components', () => {
  it('emits text, checkbox, and guarded address type changes', () => {
    const onTypeChange = vi.fn()
    const onTextChange = vi.fn()
    const onDefaultChange = vi.fn()

    render(
      <>
        <AddressTypeSelect
          label="Type"
          value="billing"
          onChange={onTypeChange}
        />
        <FieldInput label="City" value="" onChange={onTextChange} />
        <DefaultCheckbox
          id="address-default"
          checked={false}
          onChange={onDefaultChange}
        />
      </>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Choose shipping' }))
    fireEvent.click(screen.getByRole('button', { name: 'Choose unsupported' }))
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Kingston' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Default' }))

    expect(onTypeChange).toHaveBeenCalledOnce()
    expect(onTypeChange).toHaveBeenCalledWith('shipping')
    expect(onTextChange).toHaveBeenCalledWith('Kingston')
    expect(onDefaultChange).toHaveBeenCalledWith(true)
  })
})
