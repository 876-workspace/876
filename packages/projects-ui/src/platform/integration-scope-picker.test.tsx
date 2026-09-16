// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { INTEGRATION_SCOPES, IntegrationScopePicker } from './integration-scope-picker'

function scopeCheckbox(label: string): HTMLElement {
  return screen.getByRole('checkbox', { name: label })
}

function scopeInputs(): NodeListOf<HTMLInputElement> {
  return document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="scopes"]')
}

describe('IntegrationScopePicker', () => {
  afterEach(cleanup)

  it('renders all five scopes', () => {
    render(<IntegrationScopePicker />)
    for (const scope of INTEGRATION_SCOPES) {
      expect(screen.getByText(scope)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  })

  it('names every checkbox input scopes', () => {
    render(<IntegrationScopePicker />)
    expect(scopeInputs()).toHaveLength(5)
  })

  it('checks the default-selected scopes', () => {
    render(<IntegrationScopePicker defaultSelected={['time:read']} />)
    expect(scopeCheckbox('time:read')).toBeChecked()
    expect(scopeCheckbox('projects:read')).not.toBeChecked()
  })

  it('submits the scope value per box', () => {
    render(<IntegrationScopePicker />)
    const values = Array.from(scopeInputs()).map((input) => input.value)
    expect(values).toEqual([...INTEGRATION_SCOPES])
  })

  it('checks a scope when its label is clicked', () => {
    render(<IntegrationScopePicker />)
    fireEvent.click(screen.getByText('time:write'))
    expect(scopeCheckbox('time:write')).toBeChecked()
  })

  it('labels the group', () => {
    render(<IntegrationScopePicker />)
    expect(screen.getByText('Scopes')).toBeInTheDocument()
  })
})
