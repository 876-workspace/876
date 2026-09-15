import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { DEFAULT_BRANDING } from '@876/core/branding'
import { resolveDocumentTemplate } from '@876/core/document-templates'

import {
  DocumentTemplateGallery,
  type DocumentTemplateGalleryProps,
} from './document-template-gallery'

function props(
  overrides: Partial<DocumentTemplateGalleryProps> = {}
): DocumentTemplateGalleryProps {
  return {
    documentType: 'invoice',
    templates: [
      {
        id: 'tpl_standard',
        name: 'House standard',
        layout: 'standard',
        isDefault: true,
        settings: resolveDocumentTemplate('standard', 'invoice', {}),
      },
      {
        id: 'tpl_elegant',
        name: 'Premium look',
        layout: 'elegant',
        isDefault: false,
        settings: resolveDocumentTemplate('elegant', 'invoice', {}),
      },
    ],
    branding: DEFAULT_BRANDING,
    newHref: '/templates/new',
    editHrefBase: '/templates',
    ...overrides,
  }
}

describe('DocumentTemplateGallery', () => {
  it('omits the create and edit links for a read-only viewer', () => {
    // ARRANGE
    render(
      <DocumentTemplateGallery
        {...props({ newHref: null, editHrefBase: null })}
      />
    )

    // ASSERT
    expect(screen.queryByRole('link', { name: 'New template' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    expect(screen.getByText('House standard')).toBeInTheDocument()
  })

  it('omits the customize link on the built-in card for a read-only viewer', () => {
    // ARRANGE
    render(
      <DocumentTemplateGallery
        {...props({ templates: [], newHref: null, editHrefBase: null })}
      />
    )

    // ASSERT
    expect(screen.queryByRole('link', { name: 'Customize' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Create a template' })).toBeNull()
    expect(screen.getAllByText('Standard')).toHaveLength(2)
  })

  it('renders a card per template with its layout label and edit link', () => {
    // ARRANGE
    render(<DocumentTemplateGallery {...props()} />)

    // ASSERT
    expect(screen.getByText('House standard')).toBeInTheDocument()
    expect(screen.getByText('Premium look')).toBeInTheDocument()
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.getByText('Elegant')).toBeInTheDocument()
    const editLinks = screen.getAllByRole('link', { name: 'Edit' })
    expect(editLinks).toHaveLength(2)
    expect(editLinks[1]).toHaveAttribute('href', '/templates/tpl_elegant')
  })

  it('badges only the default template', () => {
    // ARRANGE
    render(<DocumentTemplateGallery {...props()} />)

    // ASSERT
    expect(screen.getAllByText('Default')).toHaveLength(1)
  })

  it('renders host card actions for the matching template', () => {
    // ARRANGE
    render(
      <DocumentTemplateGallery
        {...props({
          cardActions: { tpl_elegant: <button type="button">Delete</button> },
        })}
      />
    )

    // ASSERT
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the built-in standard card with a customize link when empty', () => {
    // ARRANGE
    render(<DocumentTemplateGallery {...props({ templates: [] })} />)

    // ASSERT
    expect(screen.getAllByText('Standard').length).toBeGreaterThan(0)
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Customize' })).toHaveAttribute(
      'href',
      '/templates/new'
    )
  })

  it('renders an inert scaled thumbnail preview per card', () => {
    // ARRANGE
    const { container } = render(<DocumentTemplateGallery {...props()} />)

    // ASSERT — thumbnails carry sample data but stay out of the a11y tree.
    const previews = container.querySelectorAll(
      '[aria-hidden="true"].pointer-events-none'
    )
    expect(previews.length).toBe(2)
    expect(container.textContent).toContain('INV-2026-001')
  })

  it('links to the new-template page', () => {
    // ARRANGE
    render(<DocumentTemplateGallery {...props()} />)

    // ASSERT
    expect(screen.getByRole('link', { name: 'New template' })).toHaveAttribute(
      'href',
      '/templates/new'
    )
  })
})
