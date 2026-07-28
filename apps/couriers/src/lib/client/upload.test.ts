/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { putDirectToStorage } from './upload'

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

  upload = new FakeUpload()
  listeners: Record<string, Listener[]> = {}
  headers: Record<string, string> = {}
  opened: { method: string; url: string; async: boolean } | null = null
  sent: unknown = null
  status = 0
  responseText = ''

  constructor() {
    FakeXhr.instances.push(this)
  }

  open(method: string, url: string, async: boolean) {
    this.opened = { method, url, async }
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }

  addEventListener(type: string, listener: Listener) {
    ;(this.listeners[type] ??= []).push(listener)
  }

  send(body: unknown) {
    this.sent = body
  }

  emit(type: string, event: unknown = {}) {
    for (const listener of this.listeners[type] ?? []) listener(event)
  }
}

function installFakeXhr() {
  FakeXhr.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  return FakeXhr
}

function pngFile() {
  return new File(['logo'], 'logo.png', { type: 'image/png' })
}

function start(onProgress?: (fraction: number) => void) {
  const file = pngFile()
  const promise = putDirectToStorage({
    url: 'https://r2.example.test/signed',
    method: 'PUT',
    headers: { 'Content-Type': 'image/png', 'Content-Length': '4' },
    file,
    onProgress,
  })

  return { promise, file, xhr: FakeXhr.instances[0] }
}

describe('putDirectToStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('request shape', () => {
    it('opens an async request with the signed method and url', () => {
      installFakeXhr()

      const { xhr } = start()

      expect(xhr.opened).toEqual({
        method: 'PUT',
        url: 'https://r2.example.test/signed',
        async: true,
      })
    })

    it('replays every signed header verbatim', () => {
      installFakeXhr()

      const { xhr } = start()

      expect(xhr.headers).toEqual({
        'Content-Type': 'image/png',
        'Content-Length': '4',
      })
    })

    it('sends the file itself as the request body', () => {
      installFakeXhr()

      const { xhr, file } = start()

      expect(xhr.sent).toBe(file)
    })
  })

  describe('progress reporting', () => {
    it('reports the completed fraction for a computable progress event', async () => {
      installFakeXhr()
      const onProgress = vi.fn()

      const { xhr } = start(onProgress)
      xhr.upload.emit('progress', {
        lengthComputable: true,
        loaded: 25,
        total: 100,
      })

      expect(onProgress).toHaveBeenCalledTimes(1)
      expect(onProgress).toHaveBeenCalledWith(0.25)
    })

    it('ignores a progress event whose length is not computable', () => {
      installFakeXhr()
      const onProgress = vi.fn()

      const { xhr } = start(onProgress)
      xhr.upload.emit('progress', {
        lengthComputable: false,
        loaded: 25,
        total: 0,
      })

      expect(onProgress).not.toHaveBeenCalled()
    })

    it('ignores a progress event reporting a zero total', () => {
      installFakeXhr()
      const onProgress = vi.fn()

      const { xhr } = start(onProgress)
      xhr.upload.emit('progress', {
        lengthComputable: true,
        loaded: 0,
        total: 0,
      })

      expect(onProgress).not.toHaveBeenCalled()
    })

    it('clamps an over-reported fraction to 1', () => {
      installFakeXhr()
      const onProgress = vi.fn()

      const { xhr } = start(onProgress)
      xhr.upload.emit('progress', {
        lengthComputable: true,
        loaded: 120,
        total: 100,
      })

      expect(onProgress).toHaveBeenCalledWith(1)
    })

    it('settles progress at 1 when the request loads', async () => {
      installFakeXhr()
      const onProgress = vi.fn()

      const { promise, xhr } = start(onProgress)
      xhr.status = 200
      xhr.emit('load')
      await promise

      expect(onProgress).toHaveBeenLastCalledWith(1)
    })

    it('does not require a progress callback', async () => {
      installFakeXhr()

      const { promise, xhr } = start()
      xhr.upload.emit('progress', {
        lengthComputable: true,
        loaded: 1,
        total: 2,
      })
      xhr.status = 200
      xhr.emit('load')

      await expect(promise).resolves.toEqual({
        ok: true,
        status: 200,
        body: '',
      })
    })
  })

  describe('resolution', () => {
    it.each([200, 201, 204, 299])(
      'resolves ok for a %i response',
      async (status) => {
        installFakeXhr()

        const { promise, xhr } = start()
        xhr.status = status
        xhr.emit('load')

        await expect(promise).resolves.toEqual({ ok: true, status, body: '' })
      }
    )

    it.each([300, 400, 403, 413, 500])(
      'resolves not-ok for a %i response and keeps the provider body',
      async (status) => {
        installFakeXhr()

        const { promise, xhr } = start()
        xhr.status = status
        xhr.responseText = '<Error><Code>AccessDenied</Code></Error>'
        xhr.emit('load')

        await expect(promise).resolves.toEqual({
          ok: false,
          status,
          body: '<Error><Code>AccessDenied</Code></Error>',
        })
      }
    )

    it('normalizes a missing response body to an empty string', async () => {
      installFakeXhr()

      const { promise, xhr } = start()
      xhr.status = 500
      xhr.responseText = undefined as unknown as string
      xhr.emit('load')

      await expect(promise).resolves.toEqual({
        ok: false,
        status: 500,
        body: '',
      })
    })
  })

  describe('transport failures', () => {
    it('rejects when the request errors', async () => {
      installFakeXhr()

      const { promise, xhr } = start()
      xhr.emit('error')

      await expect(promise).rejects.toThrow('Failed to fetch')
    })

    it('rejects when the request times out', async () => {
      installFakeXhr()

      const { promise, xhr } = start()
      xhr.emit('timeout')

      await expect(promise).rejects.toThrow('Upload timed out')
    })

    it('rejects with an AbortError when the request is aborted', async () => {
      installFakeXhr()

      const { promise, xhr } = start()
      xhr.emit('abort')

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })
  })
})
