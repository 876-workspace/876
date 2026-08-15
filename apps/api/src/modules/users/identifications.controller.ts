import type { Request, Response } from 'express'
import { AppHttpError } from '@/http/errors'
import * as repo from './users.repository'
import * as service from './users.service'
import { serializeUserIdentification } from './users.serializers'

export async function listUserIdentifications(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  await service.requireUser(userId)
  const rows = await repo.listIdentificationsByUser(userId)
  const data = rows.map((r) => serializeUserIdentification(r))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${userId}/identifications`,
    totalCount: data.length,
  })
}

export async function createUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  await service.requireUser(userId)
  const body = req.body as {
    type: string
    value: string
    countryCode?: string | null
  }
  const row = await service.createIdentification({
    userId: userId,
    type: body.type,
    rawValue: body.value,
    countryCode: body.countryCode ?? null,
  })
  res.status(201).json(serializeUserIdentification(row))
}

export async function updateUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, type } = req.params as { userId: string; type: string }
  const body = req.body as { value: string; countryCode?: string | null }
  const row = await service.updateIdentification({
    userId: userId,
    type,
    rawValue: body.value,
    countryCode: body.countryCode,
  })
  res.json(serializeUserIdentification(row))
}

export async function deleteUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, type } = req.params as { userId: string; type: string }
  const existing = await repo.findIdentificationByType(userId, type)
  if (!existing)
    throw new AppHttpError({
      code: 'identification/not-found',
      message: 'No identification of this type exists for this user.',
      httpStatus: 404,
    })
  const ok = await repo.deleteIdentification(existing.id, null, null)
  if (!ok)
    throw new AppHttpError({
      code: 'identification/not-found',
      message: 'No identification of this type exists for this user.',
      httpStatus: 404,
    })
  res.json({ object: 'user_identification', id: existing.id, deleted: true })
}

export async function discloseUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, type } = req.params as { userId: string; type: string }
  const body = req.body as {
    organizationId: string
    appSlug: string
    reason?: string | null
  }
  const ip =
    req.ip ?? (req.headers['x-forwarded-for'] as string | undefined) ?? null
  const result = await service.discloseIdentification({
    userId: userId,
    type,
    organizationId: body.organizationId,
    appSlug: body.appSlug,
    reason: body.reason ?? null,
    requestContext: {
      ip,
      deviceSignal: (req.headers['x-device-signal'] as string) ?? null,
    },
  })
  res.json({
    object: 'user_identification_disclosure',
    type,
    value: result.value,
    countryCode: result.countryCode,
    verified: result.verified,
    disclosedAt: result.disclosedAt,
  })
}

export async function verifyUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, type } = req.params as { userId: string; type: string }
  const body = req.body as { verified_by: string }
  const existing = await repo.findIdentificationByType(userId, type)
  if (!existing)
    throw new AppHttpError({
      code: 'identification/not-found',
      message: 'No identification of this type exists for this user.',
      httpStatus: 404,
    })
  const now = BigInt(Math.floor(Date.now() / 1000))
  const updated = await repo.setIdentificationVerified(
    existing.id,
    body.verified_by,
    now,
    now
  )
  if (!updated)
    throw new AppHttpError({
      code: 'identification/not-found',
      message: 'No identification of this type exists for this user.',
      httpStatus: 404,
    })
  res.json(serializeUserIdentification(updated))
}
