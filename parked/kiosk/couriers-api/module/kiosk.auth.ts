import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'
import { prisma } from './kiosk.repository'

export type KioskPrincipal = { id: string; tenantId: string; branchId: string }
declare global {
  namespace Express {
    interface Request {
      kioskDevice?: KioskPrincipal
    }
  }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export async function requireKioskDevice(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const credential = req.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!credential?.startsWith('kdev_')) throw denied()
    const supplied = Buffer.from(hash(credential))
    const row = await prisma.kioskDevice.findUnique({
      where: { credentialHash: supplied.toString('hex') },
    })
    if (
      !row ||
      row.status !== 'ACTIVE' ||
      !timingSafeEqual(supplied, Buffer.from(row.credentialHash))
    )
      throw denied()
    req.kioskDevice = {
      id: row.id,
      tenantId: row.tenantId,
      branchId: row.branchId,
    }
    // Last-used telemetry must never fail the request it is describing, and an
    // unhandled rejection here would take the process down.
    void prisma.kioskDevice
      .update({
        where: { id: row.id },
        data: { lastUsedAt: nowUnixSeconds(), updatedAt: nowUnixSeconds() },
      })
      .catch(() => undefined)
    next()
  } catch (error) {
    next(error)
  }
}
function denied() {
  return new AppHttpError({
    code: 'kiosk-device/invalid-credential',
    message: 'Invalid kiosk device credential.',
    httpStatus: 401,
  })
}
