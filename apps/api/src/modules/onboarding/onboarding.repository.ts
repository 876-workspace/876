/**
 * Every query against the onboarding tables.
 *
 * A session is identified by the natural key
 * `(organization, target_type, target_key, country, schema_version,
 * catalog_revision)` — the same unique index the Python relies on — so a session
 * answered against one catalog revision never collides with one answered against
 * another.
 */

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'

import type { JsonValue } from './onboarding.schemas'
import {
  ONBOARDING_SESSION_SELECT,
  type OnboardingSessionRow,
} from './onboarding.serializers'

const SCHEMA_VERSION = 1

type NaturalKey = {
  organizationId: string
  targetType: string
  targetKey: string
  countryCode: string
  catalogRevision: number
}

export function findSession(
  key: NaturalKey
): Promise<OnboardingSessionRow | null> {
  return prisma.onboardingSession.findFirst({
    where: { ...key, schemaVersion: SCHEMA_VERSION },
    select: ONBOARDING_SESSION_SELECT,
  })
}

/**
 * The session for this key, creating an empty draft when there is none.
 *
 * The create tolerates a unique-constraint violation and re-reads instead of
 * failing: two requests arriving together would otherwise make one of them a
 * 500, and the row the loser wanted now exists.
 */
export async function getOrCreateSession(
  key: NaturalKey,
  now: number
): Promise<OnboardingSessionRow> {
  const existing = await findSession(key)
  if (existing) return existing

  try {
    await prisma.onboardingSession.create({
      data: {
        id: generateId('onboardingSession'),
        organizationId: key.organizationId,
        targetType: key.targetType,
        targetKey: key.targetKey,
        countryCode: key.countryCode,
        schemaVersion: SCHEMA_VERSION,
        catalogRevision: key.catalogRevision,
        status: 'draft',
        createdAt: BigInt(now),
        updatedAt: BigInt(now),
      },
    })
  } catch {
    // Lost the race; the winner's row is what we want.
  }

  const created = await findSession(key)
  if (!created)
    throw new Error('The onboarding session could not be created or read back.')

  return created
}

/**
 * The most recent session for a target, whatever revision it was answered
 * against.
 *
 * Ordered by `catalog_revision` descending because submit must find the answers
 * the user actually saved, not insist on the current revision.
 */
export function findLatestSessionForTarget(params: {
  organizationId: string
  targetType: string
  targetKey: string
  countryCode: string
}): Promise<OnboardingSessionRow | null> {
  return prisma.onboardingSession.findFirst({
    where: { ...params, schemaVersion: SCHEMA_VERSION },
    orderBy: { catalogRevision: 'desc' },
    select: ONBOARDING_SESSION_SELECT,
  })
}

/**
 * Replace every answer on a session.
 *
 * One transaction: the delete and the inserts must not be separable, or a failed
 * write would leave the session with no answers at all. A session that had
 * already been submitted returns to `needs_update` rather than `draft`, and its
 * completion is cleared — editing after submission is a real state, distinct
 * from never having submitted.
 */
export async function replaceAnswers(
  sessionId: string,
  answers: Record<string, JsonValue>,
  options: { countryCode: string; now: number }
): Promise<void> {
  const now = BigInt(options.now)

  await prisma.$transaction(async (tx) => {
    const current = await tx.onboardingSession.findUnique({
      where: { id: sessionId },
      select: { submittedAt: true },
    })

    await tx.onboardingAnswer.deleteMany({ where: { sessionId } })

    const rows = Object.entries(answers).map(([fieldKey, value]) => ({
      id: generateId('onboardingAnswer'),
      sessionId,
      fieldKey,
      value: value as never,
      createdAt: now,
      updatedAt: now,
    }))
    if (rows.length > 0) await tx.onboardingAnswer.createMany({ data: rows })

    await tx.onboardingSession.update({
      where: { id: sessionId },
      data: {
        countryCode: options.countryCode,
        status: current?.submittedAt != null ? 'needs_update' : 'draft',
        completedAt: null,
        updatedAt: now,
      },
    })
  })
}

export async function markSubmitted(
  sessionId: string,
  now: number
): Promise<void> {
  await prisma.onboardingSession.update({
    where: { id: sessionId },
    data: {
      status: 'submitted',
      submittedAt: BigInt(now),
      updatedAt: BigInt(now),
    },
  })
}

export function organizationExists(organizationId: string): Promise<boolean> {
  return prisma.organization
    .findUnique({ where: { id: organizationId }, select: { id: true } })
    .then((row) => row !== null)
}

export function appSlugExists(slug: string): Promise<boolean> {
  return prisma.app
    .findFirst({ where: { slug }, select: { id: true } })
    .then((row) => row !== null)
}
