/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { attachmentsClient } from './attachments'

const calls: string[] = []

const session = {
  sessionId: 'upl_1',
  fileId: 'file_1',
  uploadUrl: 'https://r2.example.test/signed',
  method: 'PUT',
  headers: { 'Content-Type': 'text/csv', 'Content-Length': '6' },
  expiresAt: 1_700_000_600,
}

type Listener = (event: unknown) => void

class FakeUpload {
  listeners: Record<string, Listener[]> = {}

  addEventListener(type: string, listener: Listener) {
    ;(this.listeners[type] ??= []).push(listener)
  }

  emit(type: string, event: unknown) {
    for (const listener of this.listeners[type] ?? []) listener(event)
  }
}

class FakeXhr {
  static instances: FakeXhr[] = []
  /** When set, `send()` answers with this status on the next microtask. */
  static respondWith: number | null = null

  upload = new FakeUpload()
  listeners: Record<string, Listener[]> = {}
  headers: Record<string, string> = {}
  opened: string | null = null
  sent: unknown = null
  status = 0

  constructor() {
    FakeXhr.instances.push(this)
  }

  open(method: string, url: string) {
    this.opened = `${method} ${url}`
    calls.push(this.opened)
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }

  addEventListener(type: string, listener: Listener) {
    ;(this.listeners[type] ??= []).push(listener)
  }

  send(body: unknown) {
    this.sent = body
    const status = FakeXhr.respondWith
    if (status === null) return
    void Promise.resolve().then(() => {
      this.status = status
      this.emit('load')
    })
  }

  emit(type: string, event: unknown = {}) {
    for (const listener of this.listeners[type] ?? []) listener(event)
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof globalThis.fetch>()

function routeResponse(input: RequestInfo | URL, init?: RequestInit): Response {
  const url = String(input)
  calls.push(`${init?.method ?? 'GET'} ${url}`)

  if (url === '/api/attachments/upload-session')
    return jsonResponse({ data: session, error: null }, 201)
  if (url === '/api/attachments/complete')
    return jsonResponse(
      { data: { linkId: 'rlink_1', fileId: 'file_1' }, error: null },
      201
    )
  if (url === '/api/attachments/link')
    return jsonResponse(
      { data: { linkId: 'rlink_1', fileId: 'file_1' }, error: null },
      201
    )
  if (url.startsWith('/api/attachments/link/'))
    return jsonResponse({
      data: { object: 'resource_link', id: 'rlink_1', deleted: true },
      error: null,
    })

  throw new Error(`unexpected request: ${url}`)
}

function csvFile() {
  return new File(['a,b\n1\n'], 'plan.csv', { type: 'text/csv' })
}

const ref = { resourceType: 'issue' as const, resourceId: 'iss_1' }

beforeEach(() => {
  vi.clearAllMocks()
  calls.length = 0
  FakeXhr.instances = []
  FakeXhr.respondWith = 200
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation(async (input, init) =>
    routeResponse(input, init)
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('attachmentsClient.uploadFile', () => {
  it('runs the session, the direct upload and completion in that order', async () => {
    const result = await attachmentsClient.uploadFile({
      file: csvFile(),
      ...ref,
    })

    expect(calls).toEqual([
      'POST /api/attachments/upload-session',
      'PUT https://r2.example.test/signed',
      'POST /api/attachments/complete',
    ])
    expect(result).toEqual({
      data: { linkId: 'rlink_1', fileId: 'file_1' },
      error: null,
    })
  })

  it('uploads the bytes straight to the signed URL with the signed headers', async () => {
    await attachmentsClient.uploadFile({ file: csvFile(), ...ref })

    const xhr = FakeXhr.instances[0]
    expect(xhr?.opened).toBe('PUT https://r2.example.test/signed')
    expect(xhr?.headers).toEqual({
      'Content-Type': 'text/csv',
      'Content-Length': '6',
    })
    expect(xhr?.sent).toBeInstanceOf(File)
  })

  it('declares the file and the record when opening the session', async () => {
    await attachmentsClient.uploadFile({ file: csvFile(), ...ref })

    const call = fetchMock.mock.calls.find(
      ([input]) => String(input) === '/api/attachments/upload-session'
    )
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      resourceType: 'issue',
      resourceId: 'iss_1',
      fileName: 'plan.csv',
      contentType: 'text/csv',
      sizeBytes: 6,
    })
  })

  it('completes with the session id for the same record', async () => {
    await attachmentsClient.uploadFile({ file: csvFile(), ...ref })

    const call = fetchMock.mock.calls.find(
      ([input]) => String(input) === '/api/attachments/complete'
    )
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      sessionId: 'upl_1',
      resourceType: 'issue',
      resourceId: 'iss_1',
    })
  })

  it('reports byte progress while the provider request is in flight', async () => {
    FakeXhr.respondWith = null
    const onProgress = vi.fn()

    const pending = attachmentsClient.uploadFile({
      file: csvFile(),
      ...ref,
      onProgress,
    })
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1))

    FakeXhr.instances[0]!.upload.emit('progress', {
      lengthComputable: true,
      loaded: 3,
      total: 6,
    })
    FakeXhr.instances[0]!.status = 200
    FakeXhr.instances[0]!.emit('load')

    await pending
    expect(onProgress).toHaveBeenCalledWith(0.5)
    expect(onProgress).toHaveBeenLastCalledWith(1)
  })

  it('returns the session failure without uploading anything', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      calls.push(`${init?.method ?? 'GET'} ${String(input)}`)
      return jsonResponse(
        {
          data: null,
          error: {
            code: 'storage/mime-not-allowed',
            message: 'That file type is not allowed.',
          },
        },
        415
      )
    })

    const result = await attachmentsClient.uploadFile({
      file: csvFile(),
      ...ref,
    })

    expect(result.error).toMatchObject({ code: 'storage/mime-not-allowed' })
    expect(FakeXhr.instances).toHaveLength(0)
    expect(calls).toEqual(['POST /api/attachments/upload-session'])
  })

  it('reports a provider rejection and never completes', async () => {
    FakeXhr.respondWith = 500

    const result = await attachmentsClient.uploadFile({
      file: csvFile(),
      ...ref,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('storage/provider-error')
    expect(calls).not.toContain('POST /api/attachments/complete')
  })

  it('names an expired signature as an expired upload', async () => {
    FakeXhr.respondWith = 403

    const result = await attachmentsClient.uploadFile({
      file: csvFile(),
      ...ref,
    })

    expect(result.error?.code).toBe('storage/upload-expired')
    expect(result.error?.message).toContain('expired')
  })

  it('names an oversized body from the provider status', async () => {
    FakeXhr.respondWith = 413

    const result = await attachmentsClient.uploadFile({
      file: csvFile(),
      ...ref,
    })

    expect(result.error?.code).toBe('storage/file-too-large')
  })

  it('reports an unreachable provider without completing', async () => {
    FakeXhr.respondWith = null

    const pending = attachmentsClient.uploadFile({ file: csvFile(), ...ref })
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1))
    FakeXhr.instances[0]!.emit('error')

    const result = await pending

    expect(result.error?.code).toBe('storage/provider-error')
    expect(result.error?.message).toContain('connection')
    expect(calls).not.toContain('POST /api/attachments/complete')
  })

  it('passes a completion failure through to the caller', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      calls.push(`${init?.method ?? 'GET'} ${String(input)}`)
      const url = String(input)
      if (url === '/api/attachments/upload-session')
        return jsonResponse({ data: session, error: null }, 201)
      return jsonResponse(
        {
          data: null,
          error: {
            code: 'storage/upload-verification-failed',
            message: 'The upload could not be verified.',
          },
        },
        409
      )
    })

    const result = await attachmentsClient.uploadFile({
      file: csvFile(),
      ...ref,
    })

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({
      code: 'storage/upload-verification-failed',
    })
  })
})

describe('attachmentsClient.link', () => {
  it('posts the file id and the record', async () => {
    const result = await attachmentsClient.link({
      fileId: 'file_1',
      ...ref,
    })

    const call = fetchMock.mock.calls[0]
    expect(String(call?.[0])).toBe('/api/attachments/link')
    expect(call?.[1]?.method).toBe('POST')
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      fileId: 'file_1',
      resourceType: 'issue',
      resourceId: 'iss_1',
    })
    expect(result.data).toEqual({ linkId: 'rlink_1', fileId: 'file_1' })
  })
})

describe('attachmentsClient.removeLink', () => {
  it('deletes one link with the record it hangs off', async () => {
    const result = await attachmentsClient.removeLink('rlink_1', ref)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    expect(String(call?.[0])).toBe(
      '/api/attachments/link/rlink_1?resourceType=issue&resourceId=iss_1'
    )
    expect(call?.[1]?.method).toBe('DELETE')
    expect(result.data).toEqual({
      object: 'resource_link',
      id: 'rlink_1',
      deleted: true,
    })
  })

  it('encodes a link id that is unsafe in a path', async () => {
    await attachmentsClient.removeLink('rlink 1/x', ref)

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      '/api/attachments/link/rlink%201%2Fx?resourceType=issue&resourceId=iss_1'
    )
  })
})
