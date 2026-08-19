'use client'

import { useEffect, useState } from 'react'

type AsyncValueState<T> = {
  value: T | undefined
  error: Error | null
  pending: boolean
}

type PromiseResolution<T> = {
  source: Promise<T>
  value: T | undefined
  error: Error | null
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<T>).then === 'function'
  )
}

/**
 * Resolves server-started data in the background without suspending the client
 * component that owns the surrounding UI.
 *
 * Use this for form-local dependencies such as select options, lookup IDs, and
 * secondary defaults. The form can render immediately while only the dependent
 * control shows a loading state.
 */
export function useAsyncValue<T>(source: T | Promise<T>): AsyncValueState<T> {
  const promise = isPromiseLike(source) ? source : null
  const directValue = promise ? undefined : (source as T)
  const [resolution, setResolution] = useState<PromiseResolution<T> | null>(
    null
  )

  useEffect(() => {
    if (!promise) return

    let cancelled = false
    void promise.then(
      (value) => {
        if (!cancelled) setResolution({ source: promise, value, error: null })
      },
      (reason: unknown) => {
        if (cancelled) return
        setResolution({
          source: promise,
          value: undefined,
          error: reason instanceof Error ? reason : new Error(String(reason)),
        })
      }
    )

    return () => {
      cancelled = true
    }
  }, [promise])

  if (!promise) return { value: directValue, error: null, pending: false }
  if (!resolution || resolution.source !== promise)
    return { value: undefined, error: null, pending: true }

  return {
    value: resolution.value,
    error: resolution.error,
    pending: false,
  }
}
