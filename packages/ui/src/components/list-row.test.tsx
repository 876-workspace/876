import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ListRow, ListRowGroup } from './list-row'

describe('ListRow', () => {
  it('renders the entire row as one link when an href is given', () => {
    render(
      <ListRowGroup>
        <ListRow
          href="/issues/ALP-12"
          leading={<span>!</span>}
          title="Fix the auth race condition"
          subtitle="ALP-12 · ALP"
          meta="2h"
          trailing={<span>In progress</span>}
        />
      </ListRowGroup>
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/issues/ALP-12')
    expect(link).toContainElement(
      screen.getByText('Fix the auth race condition')
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('renders no link when no href is given', () => {
    render(
      <ListRowGroup>
        <ListRow title="Unlinked row" subtitle="Supporting detail" />
      </ListRowGroup>
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Unlinked row')).toBeInTheDocument()
  })
})
