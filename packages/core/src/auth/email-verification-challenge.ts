'use client'

import {
  authEmailVerificationChallengeSchema,
  type AuthEmailVerificationChallenge,
} from '../types/auth'

const EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY =
  'efesto:auth:email-verification-challenge:v1'
const LEGACY_EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY =
  'efesto:auth:email-verification-challenge'
const EMAIL_VERIFICATION_CHALLENGE_SERVER_SNAPSHOT = '__server_snapshot__'

export function saveEmailVerificationChallenge(
  challenge: AuthEmailVerificationChallenge
): boolean {
  try {
    sessionStorage.setItem(
      EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY,
      JSON.stringify(challenge)
    )
    return true
  } catch {
    return false
  }
}

export function readEmailVerificationChallenge(): AuthEmailVerificationChallenge | null {
  return parseEmailVerificationChallengeSnapshot(
    readEmailVerificationChallengeSnapshot()
  )
}

export function readEmailVerificationChallengeSnapshot(): string {
  try {
    const snapshot = sessionStorage.getItem(
      EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY
    )
    if (snapshot) return snapshot

    const legacySnapshot = sessionStorage.getItem(
      LEGACY_EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY
    )
    if (!legacySnapshot) return ''

    sessionStorage.setItem(
      EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY,
      legacySnapshot
    )
    sessionStorage.removeItem(LEGACY_EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY)

    return legacySnapshot
  } catch {
    return ''
  }
}

export function readServerEmailVerificationChallengeSnapshot(): string {
  return EMAIL_VERIFICATION_CHALLENGE_SERVER_SNAPSHOT
}

export function subscribeEmailVerificationChallenge(
  onStoreChange: () => void
): () => void {
  void onStoreChange
  return () => {}
}

export function isEmailVerificationChallengeSnapshotLoaded(
  snapshot: string
): boolean {
  return snapshot !== EMAIL_VERIFICATION_CHALLENGE_SERVER_SNAPSHOT
}

export function parseEmailVerificationChallengeSnapshot(
  snapshot: string
): AuthEmailVerificationChallenge | null {
  if (!snapshot || !isEmailVerificationChallengeSnapshotLoaded(snapshot))
    return null

  try {
    const parseResult = authEmailVerificationChallengeSchema.safeParse(
      JSON.parse(snapshot)
    )
    return parseResult.success ? parseResult.data : null
  } catch {
    return null
  }
}

export function clearEmailVerificationChallenge(): void {
  try {
    sessionStorage.removeItem(EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY)
    sessionStorage.removeItem(LEGACY_EMAIL_VERIFICATION_CHALLENGE_STORAGE_KEY)
  } catch {
    // Browser storage can be disabled.
  }
}
