'use client'

import { useEffect, useState } from 'react'

type AsyncValueState<T> = {
  value: T | undefined
  error: Error | null
  pending: boolean
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
  const immediate = isPromiseLike(source) ? undefined : source
  const [state, setState] = useState<AsyncValueState<T>>(() => ({
    value: immediate,
    error: null,
    pending: immediate === undefined,
  }))

  useEffect(() => {
    if (!isPromiseLike(source)) {
      setState({ value: source, error: null, pending: false })
      return
    }

    let cancelled = false
    setState({ value: undefined, error: null, pending: true })

    void source.then(
      (value) => {
        if (!cancelled) setState({ value, error: null, pending: false })
      },
      (reason: unknown) => {
        if (cancelled) return
        setState({
          value: undefined,
          error: reason instanceof Error ? reason : new Error(String(reason)),
          pending: false,
        })
      }
    )

    return () => {
      cancelled = true
    }
  }, [source])

  return state
}
