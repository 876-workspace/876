// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WidgetPopout } from './widget-popout'

let layoutWidth = 1_200

function PanelFixture({ size = 'md' }: { size?: 'md' | 'xl' }) {
  return (
    <div>
      <WidgetPopout.Root defaultOpen="draft">
        <WidgetPopout.Panel size={size}>
          <WidgetPopout.Content id="draft" title="Draft widget">
            <input aria-label="Draft value" defaultValue="Initial draft" />
          </WidgetPopout.Content>
        </WidgetPopout.Panel>
        <WidgetPopout.Rail>
          <WidgetPopout.Trigger id="draft" label="Draft" icon="D" />
        </WidgetPopout.Rail>
      </WidgetPopout.Root>
    </div>
  )
}

describe('Widget popout panel', () => {
  beforeEach(() => {
    cleanup()
    layoutWidth = 1_200
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({
        width: layoutWidth,
        height: 800,
        top: 0,
        right: layoutWidth,
        bottom: 800,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the same content tree when toggling docked and popout modes', async () => {
    render(<PanelFixture />)

    const input = screen.getByLabelText('Draft value')
    fireEvent.change(input, { target: { value: 'Unsaved local draft' } })

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    await waitFor(() =>
      expect((dockButton as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(dockButton)

    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('docked')
    })
    expect(screen.getByLabelText('Draft value')).toBe(input)
    expect((input as HTMLInputElement).value).toBe('Unsaved local draft')

    fireEvent.click(screen.getByRole('button', { name: 'Pop out panel' }))
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('popout')
    })
    expect(screen.getByLabelText('Draft value')).toBe(input)
  })

  it('disables docking when the main column would be narrower than 600px', async () => {
    layoutWidth = 1_000
    render(<PanelFixture />)

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    expect((dockButton as HTMLButtonElement).disabled).toBe(true)
    expect(dockButton.getAttribute('title')).toBe(
      'Not enough room to dock this panel'
    )
  })

  it('forces a docked panel back to popout when the layout becomes too narrow', async () => {
    render(<PanelFixture />)

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    await waitFor(() =>
      expect((dockButton as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(dockButton)
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('docked')
    })

    layoutWidth = 1_000
    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('popout')
    })
  })

  it('clamps an xl floating panel to the viewport minus rail and gutter', () => {
    render(<PanelFixture size="xl" />)

    const panel = document.querySelector(
      '[data-slot="widget-panel"]'
    ) as HTMLElement
    expect(panel.style.width).toBe('720px')
    // rail 52 + gutter 24 * 2 = 100
    expect(panel.style.maxWidth).toBe('calc(100vw - 100px)')
    expect(panel.getAttribute('data-can-dock')).toBe('false')
  })

  it('offsets the floating panel from the rail and trims vertical height', () => {
    render(<PanelFixture />)

    const panel = document.querySelector(
      '[data-slot="widget-panel"]'
    ) as HTMLElement
    // rail 52 + gutter 24
    expect(panel.style.right).toBe('76px')
    expect(panel.style.top).toBe('74px') // default navbar 64 + inset 10
    expect(panel.style.bottom).toBe('10px')
  })

  it('uses a minus icon for dock and a panel icon for pop out', async () => {
    render(<PanelFixture />)

    expect(
      screen.getByRole('button', { name: 'Dock panel to layout' })
    ).toBeInTheDocument()

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    await waitFor(() =>
      expect((dockButton as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(dockButton)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Pop out panel' })
      ).toBeInTheDocument()
    })
  })

  it('does not render a left active rail pip on the trigger', () => {
    render(<PanelFixture />)

    const trigger = screen.getByRole('button', { name: 'Draft' })
    expect(trigger.querySelector('.absolute.left-\\[3px\\]')).toBeNull()
    expect(trigger.querySelector('[class*="w-[3px]"]')).toBeNull()
  })
})
