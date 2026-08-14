import type { Request, Response } from 'express'

import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import { WorkOsWebhookVerifier } from '@/providers/workos/webhook-signature'

import * as service from './workos-webhooks.service'

function invalidSignature(): AppHttpError {
  return new AppHttpError({
    code: 'workos-webhook/invalid-signature',
    message: 'The request signature did not verify.',
    httpStatus: 403,
  })
}

/** Verify and dispatch a signed WorkOS event. */
export async function receive(req: Request, res: Response): Promise<void> {
  const raw = (req as unknown as { rawBody?: Buffer }).rawBody
  const verifier = new WorkOsWebhookVerifier({
    secret: getSettings().workos.webhookSecret,
  })
  const valid = verifier.verify({
    rawBody: raw ?? Buffer.from(''),
    header: req.header('WorkOS-Signature') ?? undefined,
  })
  if (!raw || !valid) throw invalidSignature()

  const event = req.body
  const { applied } = await service.dispatch(event)

  res.status(200).json({
    object: 'workos_webhook_event',
    received: true,
    event: event.event,
    applied,
  })
}
