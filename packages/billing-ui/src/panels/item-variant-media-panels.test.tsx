import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

import { ItemMediaPanel } from './item-media-panel'
import {
  ItemOptionBuilderPanel,
  itemVariantCount,
} from './item-option-builder-panel'
import { ItemVariantsPanel } from './item-variants-panel'

const options = [{ id: 'size', name: 'Size', values: ['Small', 'Large'] }]

describe('item variant and media panels', () => {
  it('counts the cartesian product of option values', () => {
    expect(
      itemVariantCount([
        ...options,
        { id: 'colour', name: 'Colour', values: ['Red', 'Blue', 'Black'] },
      ])
    ).toBe(6)
  })
  it('ignores blank options while calculating variants', () => {
    expect(
      itemVariantCount([{ id: 'size', name: '', values: ['Small'] }])
    ).toBe(1)
  })
  it('adds no more than three options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ItemOptionBuilderPanel
        state={{
          status: 'ready',
          options: [
            { id: 'a', name: 'A', values: ['a'] },
            { id: 'b', name: 'B', values: ['b'] },
            { id: 'c', name: 'C', values: ['c'] },
          ],
        }}
        onChange={onChange}
      />
    )
    expect(screen.getByRole('button', { name: 'Add option' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Add option' }))
    expect(onChange).not.toHaveBeenCalled()
  })
  it('reports duplicate option names', () => {
    render(
      <ItemOptionBuilderPanel
        state={{
          status: 'ready',
          options: [...options, { id: 'second', name: 'size', values: ['M'] }],
        }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getAllByText('Option names must be unique.')).toHaveLength(2)
  })
  it('reports duplicate values within one option', () => {
    render(
      <ItemOptionBuilderPanel
        state={{
          status: 'ready',
          options: [{ id: 'size', name: 'Size', values: ['Small', 'small'] }],
        }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getAllByText('Values must be unique.')).toHaveLength(2)
  })
  it('reports an exact options change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ItemOptionBuilderPanel
        state={{ status: 'ready', options }}
        onChange={onChange}
      />
    )
    await user.type(screen.getByLabelText('Option 1 name'), '!')
    expect(onChange).toHaveBeenCalledWith([
      { id: 'size', name: 'Size!', values: ['Small', 'Large'] },
    ])
  })
  it('renders option loading state', () => {
    render(
      <ItemOptionBuilderPanel
        state={{ status: 'loading' }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Options')).toBeInTheDocument()
  })
  it('renders option failure distinct from empty state', () => {
    render(
      <ItemOptionBuilderPanel
        state={{ status: 'error', message: 'Options failed' }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Options failed')
  })
  it('renders minor-unit strings without number precision loss', () => {
    render(
      <ItemVariantsPanel
        state={{
          status: 'ready',
          variants: [
            {
              id: 'variant_1',
              label: 'Small',
              sku: null,
              sellingAmount: '9007199254740993',
              costAmount: null,
              stockQuantity: 3,
              isActive: true,
            },
          ],
        }}
        formatAmount={(amount) => (amount === null ? '—' : `J$${amount}`)}
        onSave={async () => ({ error: null })}
      />
    )
    expect(screen.getByLabelText('Small selling amount')).toHaveValue(
      '9007199254740993'
    )
  })
  it('passes a complete variant patch to its host', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => ({ error: null }))
    render(
      <ItemVariantsPanel
        state={{
          status: 'ready',
          variants: [
            {
              id: 'variant_1',
              label: 'Small',
              sku: 'S',
              sellingAmount: '100',
              costAmount: '50',
              stockQuantity: 3,
              isActive: true,
            },
          ],
        }}
        formatAmount={() => '—'}
        onSave={onSave}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith('variant_1', {
      sku: 'S',
      sellingAmount: '100',
      costAmount: '50',
      stockQuantity: 3,
      isActive: true,
    })
  })
  it('renders media empty state', () => {
    render(
      <ItemMediaPanel
        state={{ status: 'empty' }}
        onStartUpload={vi.fn()}
        onCompleteUpload={vi.fn()}
        onDetach={vi.fn()}
        onReorder={vi.fn()}
      />
    )
    expect(screen.getByText('No images yet.')).toBeInTheDocument()
  })
  it('renders media failed state', () => {
    render(
      <ItemMediaPanel
        state={{ status: 'error', message: 'Media failed' }}
        onStartUpload={vi.fn()}
        onCompleteUpload={vi.fn()}
        onDetach={vi.fn()}
        onReorder={vi.fn()}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Media failed')
  })
  it('uses a legacy imageUrl when storage media is empty', () => {
    render(
      <ItemMediaPanel
        state={{
          status: 'empty',
          legacyImageUrl: 'https://example.test/legacy.jpg',
        }}
        onStartUpload={vi.fn()}
        onCompleteUpload={vi.fn()}
        onDetach={vi.fn()}
        onReorder={vi.fn()}
      />
    )
    expect(
      screen.getByRole('img', { name: 'Legacy item image' })
    ).toHaveAttribute('src', 'https://example.test/legacy.jpg')
  })
  it('reorders media using exact file ids', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn(async () => ({ error: null }))
    render(
      <ItemMediaPanel
        state={{
          status: 'ready',
          media: [
            { fileId: 'file_1', src: null, position: 0 },
            { fileId: 'file_2', src: null, position: 1 },
          ],
        }}
        onStartUpload={vi.fn()}
        onCompleteUpload={vi.fn()}
        onDetach={vi.fn()}
        onReorder={onReorder}
      />
    )
    await user.click(screen.getAllByRole('button', { name: '↓' })[0]!)
    expect(onReorder).toHaveBeenCalledWith(['file_2', 'file_1'])
  })
  it('keeps the completed file id available for a retry without another upload', async () => {
    const start = vi.fn(async () => ({ fileId: 'file_9' }))
    const complete = vi.fn(async () => ({
      error: { message: 'Attach failed' },
    }))
    const { container } = render(
      <ItemMediaPanel
        state={{ status: 'empty' }}
        onStartUpload={start}
        onCompleteUpload={complete}
        onDetach={vi.fn()}
        onReorder={vi.fn()}
      />
    )
    const input = container.querySelector('input[type=file]')
    if (!input) throw new Error('file input missing')
    fireEvent.change(input, {
      target: {
        files: [new File(['data'], 'image.png', { type: 'image/png' })],
      },
    })
    await screen.findByRole('button', { name: 'Retry' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(start).toHaveBeenCalledTimes(1)
    expect(complete).toHaveBeenCalledWith('file_9')
  })
})
