import type { Request, Response } from 'express'
import { AppHttpError } from '@/http/errors'
import * as repo from './users.repository'
import * as service from './users.service'
import { serializeUserIdentification } from './users.serializers'

export async function listUserIdentifications(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  await service.requireUser(user_id)
  const rows = await repo.listIdentificationsByUser(user_id)
  const data = rows.map((r) => serializeUserIdentification(r))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${user_id}/identifications`,
    total_count: data.length,
  })
}

export async function createUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  await service.requireUser(user_id)
  const body = req.body as {
    type: string
    value: string
    country_code?: string | null
  }
  const row = await service.createIdentification({
    userId: user_id,
    type: body.type,
    rawValue: body.value,
    countryCode: body.country_code ?? null,
  })
  res.status(201).json(serializeUserIdentification(row))
}

export async function updateUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, type } = req.params as { user_id: string; type: string }
  const body = req.body as { value: string; country_code?: string | null }
  const row = await service.updateIdentification({
    userId: user_id,
    type,
    rawValue: body.value,
    countryCode: body.country_code,
  })
  res.json(serializeUserIdentification(row))
}

export async function deleteUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, type } = req.params as { user_id: string; type: string }
  const existing = await repo.findIdentificationByType(user_id, type)
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
  const { user_id, type } = req.params as { user_id: string; type: string }
  const body = req.body as {
    organization_id: string
    app_slug: string
    reason?: string | null
  }
  const ip =
    req.ip ?? (req.headers['x-forwarded-for'] as string | undefined) ?? null
  const result = await service.discloseIdentification({
    userId: user_id,
    type,
    organizationId: body.organization_id,
    appSlug: body.app_slug,
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
    country_code: result.countryCode,
    verified: result.verified,
    disclosed_at: result.disclosedAt,
  })
}

export async function verifyUserIdentification(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, type } = req.params as { user_id: string; type: string }
  const body = req.body as { verified_by: string }
  const existing = await repo.findIdentificationByType(user_id, type)
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
