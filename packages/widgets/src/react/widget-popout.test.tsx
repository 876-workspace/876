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
import { ChatRail } from './chat-rail'

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

  it('clamps an xl floating panel to the viewport minus rail and gutters', () => {
    render(<PanelFixture size="xl" />)

    const panel = document.querySelector(
      '[data-slot="widget-panel"]'
    ) as HTMLElement
    expect(panel.style.width).toBe('720px')
    // edge 8*2 + rail 48 + gap 8 = 72
    // edge 16*2 + rail 48 + gap 8 = 88
    expect(panel.style.maxWidth).toBe('calc(100vw - 88px)')
    expect(panel.getAttribute('data-can-dock')).toBe('false')
  })

  it('renders the icon rail as an in-flow rounded card, not an overlay', () => {
    render(<PanelFixture />)

    const rail = document.querySelector(
      '[data-slot="widget-rail"]'
    ) as HTMLElement
    const primary = document.querySelector(
      '[data-slot="widget-rail-primary"]'
    ) as HTMLElement

    // Column shell — never fixed/absolute; reserves real layout space.
    expect(rail.className).not.toContain('fixed')
    expect(rail.className).not.toContain('absolute')
    expect(rail.className).toContain('mr-4')
    expect(rail.style.marginTop).toBe('20px')
    expect(rail.style.marginBottom).toBe('20px')
    expect(rail.style.height).toBe('calc(100% - 40px)')

    // Primary section is its own floating card.
    expect(primary.className).not.toContain('fixed')
    expect(primary.className).not.toContain('absolute')
    expect(primary.className).toContain('rounded-2xl')
    expect(primary.className).toContain('ring-1')
  })

  it('Rail without chat renders only the primary card with flex-1 and no chat-rail in the DOM', () => {
    render(<PanelFixture />)

    const primary = document.querySelector(
      '[data-slot="widget-rail-primary"]'
    ) as HTMLElement
    const chatRail = document.querySelector('[data-slot="chat-rail"]')

    // Primary card fills the full rail when no chat card is present.
    expect(primary.className).toContain('flex-1')
    expect(primary.className).not.toContain('flex-[65]')
    // Chat rail must be completely absent from the DOM.
    expect(chatRail).toBeNull()
  })

  it('Rail with chat={<ChatRail />} renders chat-rail nav with aria-label "876 Chat" and primary keeps flex-[65]', () => {
    render(
      <div>
        <WidgetPopout.Root defaultOpen="draft">
          <WidgetPopout.Panel size="md">
            <WidgetPopout.Content id="draft" title="Draft widget">
              <input aria-label="Draft value" defaultValue="Initial draft" />
            </WidgetPopout.Content>
          </WidgetPopout.Panel>
          <WidgetPopout.Rail chat={<ChatRail />}>
            <WidgetPopout.Trigger id="draft" label="Draft" icon="D" />
          </WidgetPopout.Rail>
        </WidgetPopout.Root>
      </div>
    )

    const primary = document.querySelector(
      '[data-slot="widget-rail-primary"]'
    ) as HTMLElement
    const chatRail = document.querySelector(
      '[data-slot="chat-rail"]'
    ) as HTMLElement

    // Primary must use the split flex ratio when chat is present.
    expect(primary.className).toContain('flex-[65]')
    expect(primary.className).toContain('basis-0')
    // Chat rail must be present with the correct accessible label.
    expect(chatRail).not.toBeNull()
    expect(chatRail.getAttribute('aria-label')).toBe('876 Chat')
    expect(chatRail.className).toContain('flex-[35]')
    expect(chatRail.className).toContain('basis-0')
  })

  it('offsets the floating panel beside the in-flow rail', () => {
    render(<PanelFixture />)

    const panel = document.querySelector(
      '[data-slot="widget-panel"]'
    ) as HTMLElement
    // edge 16 + rail 48 + gap 8 = 72
    expect(panel.style.right).toBe('72px')
    expect(panel.style.top).toBe('84px')
    expect(panel.style.bottom).toBe('20px')
    expect(panel.getAttribute('data-presentation')).toBe('popout')
    expect(panel.className).toContain('fixed')
    expect(panel.className).toContain('rounded-2xl')
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
