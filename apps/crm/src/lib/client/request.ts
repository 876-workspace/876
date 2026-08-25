'use client'

export type ClientResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code?: string; message: string } }

export async function request<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ClientResult<T>> {
  const response = await fetch(input, init)
  const body = (await response.json().catch(() => null)) as
    | { data?: T; error?: string; code?: string }
    | null

  if (!response.ok || !body?.data) {
    return {
      data: null,
      error: {
        code: body?.code,
        message: body?.error ?? 'Something went wrong.',
      },
    }
  }

  return { data: body.data, error: null }
}
