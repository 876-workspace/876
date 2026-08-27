import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import {
  CATEGORY_ICONS,
  CATEGORY_ICON_KEYS,
  CategoryIcon,
  isCategoryIconKey,
} from './category-icons'

describe('CATEGORY_ICON_KEYS', () => {
  it('lists every key in the catalog exactly once', () => {
    expect(CATEGORY_ICON_KEYS).toEqual(Object.keys(CATEGORY_ICONS))
    expect(new Set(CATEGORY_ICON_KEYS).size).toBe(CATEGORY_ICON_KEYS.length)
  })

  it('uses only lowercase kebab-case keys, so a stored value is stable', () => {
    for (const key of CATEGORY_ICON_KEYS) {
      expect(key).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
    }
  })

  it('includes the glyphs the category picker is expected to offer', () => {
    // `bug` is the one the product owner named explicitly, and `tag` is the
    // fallback every unknown key resolves to — neither may be dropped.
    expect(CATEGORY_ICON_KEYS).toContain('bug')
    expect(CATEGORY_ICON_KEYS).toContain('tag')
  })

  it('renders every catalog entry as an svg', () => {
    for (const key of CATEGORY_ICON_KEYS) {
      const { container, unmount } = render(<CategoryIcon name={key} />)
      expect(container.querySelector('svg')).not.toBeNull()
      unmount()
    }
  })
})

describe('isCategoryIconKey', () => {
  it('accepts a key that is in the catalog', () => {
    expect(isCategoryIconKey('bug')).toBe(true)
  })

  it.each([
    ['an unknown key', 'ladybird'],
    ['an empty string', ''],
    ['a prototype property name', 'toString'],
    ['a non-string', 42],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(isCategoryIconKey(value)).toBe(false)
  })
})

describe('CategoryIcon', () => {
  it('renders the requested glyph', () => {
    const { container } = render(
      <CategoryIcon name="bug" data-testid="icon" className="size-4" />
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveClass('size-4')
  })

  it.each([
    ['an unknown key', 'ladybird'],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to the tag glyph for %s rather than throwing', (_l, value) => {
    // A category row may hold a key written by an older build. Rendering the
    // fallback is what keeps one retired glyph from taking the settings page
    // down with it.
    const fallback = render(<CategoryIcon name="tag" />)
    const expected = fallback.container.innerHTML

    const { container } = render(
      <CategoryIcon name={value as string | null | undefined} />
    )
    expect(container.innerHTML).toBe(expected)
  })

  it('forwards arbitrary svg props through to the element', () => {
    const { container } = render(
      <CategoryIcon name="billing" role="img" aria-label="Billing" />
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg).toHaveAttribute('aria-label', 'Billing')
  })
})
