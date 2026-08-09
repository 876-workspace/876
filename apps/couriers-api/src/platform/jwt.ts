import { createSecretKey } from 'node:crypto'

import { jwtVerify, SignJWT } from 'jose'

import { getSettings } from '@/config'

export type ProviderClaims = {
  sub?: string
  aud?: string | string[]
  token_use?: string
  realm?: string
  org_id?: string
  exp?: number
  [key: string]: unknown
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getSettings().sessionCookieSecret)
}

export async function verifyProviderJwt(
  token: string
): Promise<ProviderClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return payload as ProviderClaims
  } catch {
    return null
  }
}

export async function signProviderJwt(claims: ProviderClaims): Promise<string> {
  const key = createSecretKey(secretKey())
  return new SignJWT(claims as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(key)
}
