/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MentionInput } from '../components/mention-input'

const members = [
  { userId: 'usr_ada', label: 'Ada Lovelace' },
  { userId: 'usr_alan', label: 'Alan Turing' },
]

function setup(value = '', onValueChange: (next: string) => void = () => {}) {
  return render(
    <MentionInput
      id="body"
      name="body"
      value={value}
      onValueChange={onValueChange}
      members={members}
    />
  )
}

function ControlledInput({
  initial,
  onValueChange,
}: {
  initial: string
  onValueChange?: (next: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <MentionInput
      id="body"
      name="body"
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
      members={members}
    />
  )
}

describe('MentionInput', () => {
  afterEach(cleanup)

  it('renders a labelled textarea', () => {
    setup()

    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'body')
  })

  it('shows member suggestions after typing @', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ControlledInput initial="" onValueChange={onValueChange} />)

    await user.type(screen.getByRole('textbox'), 'Hi @ad')

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByText('Alan Turing')).not.toBeInTheDocument()
    expect(onValueChange).toHaveBeenCalled()
  })

  it('inserts a user token when a suggestion is picked', async () => {
    const user = userEvent.setup()
    let inserted = ''
    render(
      <ControlledInput
        initial="Hi @ad"
        onValueChange={(next) => {
          inserted = next
        }}
      />
    )
    const box = screen.getByRole('textbox')
    box.focus()
    ;(box as HTMLTextAreaElement).setSelectionRange(6, 6)

    await user.type(box, 'a')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByText('Ada Lovelace'))

    expect(inserted).toContain('@[Ada Lovelace](user:usr_ada)')
  })

  it('shows no suggestions without an @ trigger', async () => {
    const user = userEvent.setup()
    setup('Just text')

    await user.click(screen.getByRole('textbox'))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('filters to nothing when no member matches', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(screen.getByRole('textbox'), 'Hi @zzz')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
