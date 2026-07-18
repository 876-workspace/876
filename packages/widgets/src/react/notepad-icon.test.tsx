// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NotepadIcon } from './notepad-icon'

describe('NotepadIcon', () => {
  it('uses unique gradient definitions for every rendered widget icon', () => {
    const { container } = render(
      <>
        <NotepadIcon data-testid="rail-icon" />
        <NotepadIcon data-testid="panel-icon" />
      </>
    )
    const gradients = [...container.querySelectorAll('linearGradient')]
    const gradientIds = gradients.map((gradient) => gradient.id)
    const gradientFills = [
      ...container.querySelectorAll('rect[fill], path[fill]'),
    ]
      .map((element) => element.getAttribute('fill'))
      .filter((fill) => fill?.startsWith('url('))

    expect(gradientIds).toHaveLength(4)
    expect(new Set(gradientIds)).toHaveLength(4)
    expect(gradientFills).toEqual(
      gradientIds.map((gradientId) => `url(#${gradientId})`)
    )
  })
})
