// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { InstantiateOptions } from './instantiate-options'

const FLAGS = ['includeWorkItems', 'includeDependencies', 'includeBudgets']

function flagInput(name: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    `input[type="checkbox"][name="${name}"]`
  )
  if (!input) throw new Error(`Expected a checkbox input named ${name}`)
  return input
}

function flagCheckbox(label: string): HTMLElement {
  return screen.getByRole('checkbox', { name: label })
}

describe('InstantiateOptions', () => {
  afterEach(cleanup)

  it('renders one named checkbox per inclusion flag', () => {
    render(<InstantiateOptions />)

    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    for (const flag of FLAGS) {
      expect(flagInput(flag)).toBeInTheDocument()
    }
  })

  it('labels each checkbox with the flag it controls', () => {
    render(<InstantiateOptions />)

    expect(flagCheckbox('Work items')).toBeInTheDocument()
    expect(flagCheckbox('Dependencies')).toBeInTheDocument()
    expect(flagCheckbox('Budgets')).toBeInTheDocument()
  })

  it('includes every part of the template by default', () => {
    render(<InstantiateOptions />)

    expect(flagCheckbox('Work items')).toBeChecked()
    expect(flagCheckbox('Dependencies')).toBeChecked()
    expect(flagCheckbox('Budgets')).toBeChecked()
  })

  it('honours defaultValues that exclude a part of the template', () => {
    render(<InstantiateOptions defaultValues={{ includeBudgets: false }} />)

    expect(flagCheckbox('Budgets')).not.toBeChecked()
    expect(flagCheckbox('Work items')).toBeChecked()
    expect(flagCheckbox('Dependencies')).toBeChecked()
  })

  it('submits every flag through form data as a string', () => {
    const { container } = render(
      <form>
        <InstantiateOptions defaultValues={{ includeDependencies: false }} />
      </form>
    )

    const form = container.querySelector('form')
    if (!form) throw new Error('Expected a form')

    const data = new FormData(form)

    expect(data.get('includeWorkItems')).toBe('true')
    expect(data.get('includeDependencies')).toBe('false')
    expect(data.get('includeBudgets')).toBe('true')
  })

  it('describes each option', () => {
    render(<InstantiateOptions />)

    expect(
      screen.getByText('Phases, task lists, and work items')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Links between the new work items')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Budget defaults from the template')
    ).toBeInTheDocument()
  })

  it('groups the checkboxes in one labelled field set', () => {
    render(<InstantiateOptions />)

    const group = screen.getByRole('group', {
      name: 'Include in the new project',
    })

    expect(group.tagName).toBe('FIELDSET')
    expect(group.querySelectorAll('input[type="checkbox"]')).toHaveLength(3)
  })

  it('associates each label with the checkbox input it names', () => {
    render(<InstantiateOptions />)

    for (const flag of FLAGS) {
      expect(flagInput(flag).id).toBe(flag)
      expect(document.querySelector(`label[for="${flag}"]`)).not.toBeNull()
    }
  })

  it('checks an excluded flag when its label is clicked', () => {
    render(<InstantiateOptions defaultValues={{ includeBudgets: false }} />)

    fireEvent.click(screen.getByText('Budgets'))

    expect(flagCheckbox('Budgets')).toBeChecked()
  })

  it('checks an excluded flag when its control is clicked', () => {
    render(<InstantiateOptions defaultValues={{ includeBudgets: false }} />)

    fireEvent.click(flagCheckbox('Budgets'))

    expect(flagCheckbox('Budgets')).toBeChecked()
  })
})
