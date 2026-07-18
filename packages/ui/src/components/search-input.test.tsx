import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SearchInput } from './search-input'

describe('SearchInput', () => {
  it('enables searching only after a meaningful query and supports Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSearch = vi.fn()
    const { rerender } = render(
      <SearchInput value="a" onChange={onChange} onSearch={onSearch} />
    )

    expect(screen.getByRole('button', { name: 'Search' })).toHaveProperty(
      'disabled',
      true
    )
    await user.type(screen.getByRole('textbox'), 'da')
    expect(onChange).toHaveBeenLastCalledWith('aa')

    rerender(
      <SearchInput value="ada" onChange={onChange} onSearch={onSearch} />
    )
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'Search' })).toHaveProperty(
      'disabled',
      false
    )
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('prevents duplicate searches while pending', () => {
    render(
      <SearchInput
        value="ada"
        onChange={vi.fn()}
        onSearch={vi.fn()}
        isPending
      />
    )

    expect(screen.getByRole('button', { name: 'Searching…' })).toHaveProperty(
      'disabled',
      true
    )
  })
})
