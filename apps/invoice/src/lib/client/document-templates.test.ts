import { beforeEach, describe, expect, it, vi } from 'vitest'

import { documentTemplates } from './document-templates'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./request', () => ({ request: requestMock }))

describe('Invoice document templates browser client', () => {
  beforeEach(() => {
    requestMock.mockResolvedValue({ data: null, error: null })
    vi.clearAllMocks()
  })

  it('lists templates for a document type with the exact query', async () => {
    // ARRANGE — no input

    // ACT
    await documentTemplates.list({ documentType: 'invoice' })

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/document-templates?documentType=invoice'
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('lists templates without a query when no filter is given', async () => {
    // ARRANGE — no input

    // ACT
    await documentTemplates.list({})

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/document-templates')

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('creates a template with the exact payload once', async () => {
    // ARRANGE
    const params = {
      documentType: 'invoice' as const,
      name: 'Invoice template',
      layout: 'standard' as const,
      settings: {},
    }

    // ACT
    await documentTemplates.create(params)

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/document-templates', {
      method: 'POST',
      body: JSON.stringify(params),
    })

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('retrieves a template with the encoded id', async () => {
    // ARRANGE — no input

    // ACT
    await documentTemplates.retrieve('dtpl /1')

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/document-templates/dtpl%20%2F1',
      { method: 'GET' }
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('updates a template with the exact id and payload', async () => {
    // ARRANGE
    const params = { name: 'Updated' }

    // ACT
    await documentTemplates.update('dtpl_1', params)

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/document-templates/dtpl_1', {
      method: 'PATCH',
      body: JSON.stringify(params),
    })

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('deletes a template with the encoded id', async () => {
    // ARRANGE — no input

    // ACT
    await documentTemplates.delete('dtpl /1')

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/document-templates/dtpl%20%2F1',
      { method: 'DELETE' }
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('sets the default template with the exact subpath', async () => {
    // ARRANGE — no input

    // ACT
    await documentTemplates.setDefault('dtpl_1')

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/document-templates/dtpl_1/set-default',
      { method: 'POST', body: JSON.stringify({}) }
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('resolves a template with the exact query', async () => {
    // ARRANGE — no input

    // ACT
    await documentTemplates.resolve('invoice', 'dtpl_1')

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/document-templates/resolved?documentType=invoice&templateId=dtpl_1'
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('resolves the default template without a template id', async () => {
    // ARRANGE — no input

    // ACT
    await documentTemplates.resolve('invoice')

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/document-templates/resolved?documentType=invoice'
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
