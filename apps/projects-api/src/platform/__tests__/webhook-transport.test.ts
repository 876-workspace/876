import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}))

vi.mock('node:https', () => ({
  request: mockRequest,
}))

const signature = await import('../webhook-signature.js')
const ssrf = await import('../ssrf.js')

class FakeClientRequest extends EventEmitter {
  timeoutMs: number | null = null
  timeoutCallback: (() => void) | null = null
  destroyed: unknown = null
  written: string[] = []
  ended = false

  setTimeout(ms: number, callback: () => void): this {
    this.timeoutMs = ms
    this.timeoutCallback = callback
    return this
  }

  destroy(error?: Error): this {
    this.destroyed = error ?? new Error('destroyed')
    this.emit('error', this.destroyed)
    return this
  }

  write(chunk: string): boolean {
    this.written.push(chunk)
    return true
  }

  end(): this {
    this.ended = true
    return this
  }

  fireTimeout(): void {
    this.timeoutCallback?.()
  }
}

class FakeIncomingMessage extends EventEmitter {
  statusCode: number
  destroyed = false

  constructor(status: number) {
    super()
    this.statusCode = status
  }

  resume(): void {}

  destroy(): void {
    this.destroyed = true
  }
}

function setupResponse(status: number, body: string): FakeClientRequest {
  const req = new FakeClientRequest()
  mockRequest.mockImplementationOnce(
    (
      _url: string,
      _options: Record<string, unknown>,
      callback: (res: FakeIncomingMessage) => void
    ) => {
      queueMicrotask(() => {
        const res = new FakeIncomingMessage(status)
        callback(res)
        if (body.length > 0) res.emit('data', Buffer.from(body))
        res.emit('end')
      })
      return req
    }
  )
  return req
}

beforeEach(() => {
  mockRequest.mockReset()
})

describe('webhook transport constants', () => {
  it('times out after ten seconds', () => {
    expect(signature.WEBHOOK_TIMEOUT_MS).toBe(10_000)
  })

  it('caps response bodies at sixty-four kilobytes', () => {
    expect(signature.WEBHOOK_RESPONSE_MAX_BYTES).toBe(64 * 1024)
  })

  it('uses the shared signature header', () => {
    expect(signature.WEBHOOK_SIGNATURE_HEADER).toBe('x-876-signature')
  })
})

describe('postWebhook url guard', () => {
  it('rejects http urls before any request', async () => {
    await expect(
      signature.postWebhook('http://hooks.example.com/x', 'secret', { a: 1 })
    ).rejects.toThrow('https-required')
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('rejects urls with credentials before any request', async () => {
    await expect(
      signature.postWebhook('https://user:pw@hooks.example.com/x', 'secret', { a: 1 })
    ).rejects.toThrow('credentials-in-url')
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('rejects blocked ip literals before any request', async () => {
    await expect(
      signature.postWebhook('https://10.0.0.1/hook', 'secret', { a: 1 })
    ).rejects.toThrow('blocked-address')
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('rejects multicast literals before any request', async () => {
    await expect(
      signature.postWebhook('https://224.0.0.1/hook', 'secret', { a: 1 })
    ).rejects.toThrow('blocked-address')
    expect(mockRequest).not.toHaveBeenCalled()
  })
})

describe('postWebhook injectable transport', () => {
  it('sends a signed webhook request through the injected transport', async () => {
    const seen: Array<{ url: string; headers: Record<string, string>; body: string }> = []
    const result = await signature.postWebhook(
      'https://93.184.216.34/hook',
      'endpoint-secret',
      { hello: 'world' },
      {
        transport: async (req) => {
          seen.push({ url: req.url, headers: req.headers, body: req.body })
          return { status: 200 }
        },
        now: () => 1_700_000_000_000,
      }
    )
    expect(result.status).toBe(200)
    expect(seen.length).toBe(1)
    const first = seen[0]
    expect(first?.url).toBe('https://93.184.216.34/hook')
    expect(first?.headers['x-876-signature']).toMatch(/^t=1700000000,v1=[0-9a-f]+$/)
    expect(JSON.parse(first?.body ?? '{}')).toEqual({ hello: 'world' })
  })

  it('propagates transport rejections to the caller', async () => {
    await expect(
      signature.postWebhook('https://93.184.216.34/hook', 'secret', {}, {
        transport: async () => {
          throw new Error('boom')
        },
      })
    ).rejects.toThrow('boom')
  })
})

describe('default https transport', () => {
  it('resolves with the response status', async () => {
    setupResponse(200, '{"ok":true}')
    const result = await signature.postWebhook('https://93.184.216.34/hook', 'secret', { a: 1 })
    expect(result.status).toBe(200)
  })

  it('records three-xx without following redirects', async () => {
    setupResponse(302, '')
    const result = await signature.postWebhook('https://93.184.216.34/hook', 'secret', { a: 1 })
    expect(result.status).toBe(302)
    expect(mockRequest).toHaveBeenCalledTimes(1)
  })

  it('arms a ten second timeout that destroys the request', async () => {
    const req = new FakeClientRequest()
    mockRequest.mockImplementationOnce(() => req)
    const pending = signature.postWebhook('https://93.184.216.34/hook', 'secret', { a: 1 })
    await Promise.resolve()
    expect(req.timeoutMs).toBe(10_000)
    req.fireTimeout()
    await expect(pending).rejects.toThrow('webhook-timeout')
  })

  it('discards response bodies larger than the cap', async () => {
    const req = new FakeClientRequest()
    const state: { observed: FakeIncomingMessage | null } = { observed: null }
    mockRequest.mockImplementationOnce(
      (
        _url: string,
        _options: Record<string, unknown>,
        callback: (res: FakeIncomingMessage) => void
      ) => {
        queueMicrotask(() => {
          const res = new FakeIncomingMessage(200)
          state.observed = res
          callback(res)
          for (let index = 0; index < 70; index += 1)
            res.emit('data', Buffer.alloc(1024, 'x'))
          res.emit('end')
        })
        return req
      }
    )
    const result = await signature.postWebhook('https://93.184.216.34/hook', 'secret', { a: 1 })
    expect(result.status).toBe(200)
    expect(state.observed?.destroyed).toBe(true)
  })

  it('fails closed when dns resolves to a blocked address', async () => {
    const req = new FakeClientRequest()
    let capturedLookup:
      | ((hostname: string, options: unknown, callback: unknown) => void)
      | null = null
    mockRequest.mockImplementationOnce(
      (
        _url: string,
        options: {
          lookup: (hostname: string, opts: unknown, cb: unknown) => void
        },
      ) => {
        capturedLookup = options.lookup
        queueMicrotask(() => {
          options.lookup('hooks.example.com', { all: true }, (err: Error | null) => {
            if (err) req.emit('error', err)
          })
        })
        return req
      }
    )
    const pending = signature.postWebhook('https://hooks.example.com/hook', 'secret', {}, {
      resolver: async () => [{ address: '10.0.0.1', family: 4 }],
    })
    await expect(pending).rejects.toThrow('blocked-address')
    expect(capturedLookup).not.toBeNull()
    expect(ssrf.isBlockedAddress('10.0.0.1')).toBe(true)
  })
})
