import { describe, expect, it, vi } from 'vitest'

// Root `index.ts` imports `server-only` (Next.js guard). Test the public surface
// via the same modules index re-exports, without loading the server-only shim.
import { create876StorageClient } from './client'
import {
  appErrorSchema,
  storageClientErrorCodeSchema,
  storageErrorCodeSchema,
  storageErrorResponseSchema,
} from './types/common'
import {
  deletedFileSchema,
  fileAudienceSchema,
  fileCategorySchema,
  fileOwnerTypeSchema,
  fileReadUrlCreateParamsSchema,
  fileSchema,
  fileStatusSchema,
  readUrlSchema,
} from './types/files'
import {
  uploadCreateParamsSchema,
  uploadHeadersSchema,
  uploadSessionSchema,
} from './types/uploads'

describe('@876/storage public module surface', () => {
  it('exports create876StorageClient factory', () => {
    expect(typeof create876StorageClient).toBe('function')
  })

  it('exports all required zod schemas', () => {
    const schemas = [
      appErrorSchema,
      deletedFileSchema,
      fileAudienceSchema,
      fileCategorySchema,
      fileOwnerTypeSchema,
      fileReadUrlCreateParamsSchema,
      fileSchema,
      fileStatusSchema,
      readUrlSchema,
      storageClientErrorCodeSchema,
      storageErrorCodeSchema,
      storageErrorResponseSchema,
      uploadCreateParamsSchema,
      uploadHeadersSchema,
      uploadSessionSchema,
    ]
    for (const schema of schemas) {
      expect(schema).toBeDefined()
      expect(typeof schema.safeParse).toBe('function')
    }
  })

  it('client surface only exposes uploads and files namespaces', () => {
    const fetchMock = vi.fn<typeof fetch>()
    const client = create876StorageClient({
      baseUrl: 'https://example.test',
      internalKey: 'k',
      fetch: fetchMock,
    })
    expect(Object.keys(client).toSorted()).toEqual(['files', 'uploads'])
    expect(Object.keys(client.files).toSorted()).toEqual([
      'createReadUrl',
      'delete',
      'retrieve',
    ])
    expect(Object.keys(client.uploads).toSorted()).toEqual(['complete', 'create'])
  })
})
