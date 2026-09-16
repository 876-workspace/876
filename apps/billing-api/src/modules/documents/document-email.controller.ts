import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { requiredCommandIdempotency } from '@/http/command-idempotency'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import {
  prepareDocumentEmail,
  sendDocumentEmail,
} from './document-email.service'
import type {
  DocumentEmailPrepareQuery,
  DocumentEmailSendBody,
} from './schemas/email'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Document guard did not resolve a tenant.')
  return id
}

function param(req: Request, name: string) {
  return validParams<Record<string, string>>(req)[name]!
}

function sourceApp(req: Request) {
  const principal = getPrincipal(req)
  return principal.platformAdmin ? undefined : (principal.appId ?? undefined)
}

function actor(req: Request) {
  const principal = getPrincipal(req)
  return principal.userId ?? principal.appId ?? undefined
}

function prepare(
  req: Request,
  resourceType: 'invoice' | 'quote',
  resourceIdName: 'invoiceId' | 'quoteId',
  withSourceApp: boolean
) {
  return prepareDocumentEmail(
    tenant(req),
    resourceType,
    param(req, resourceIdName),
    validQuery<DocumentEmailPrepareQuery>(req),
    withSourceApp ? sourceApp(req) : undefined
  )
}

function send(
  req: Request,
  resourceType: 'invoice' | 'quote',
  resourceIdName: 'invoiceId' | 'quoteId',
  withSourceApp: boolean
) {
  const resourceId = param(req, resourceIdName)
  const body = validBody<DocumentEmailSendBody>(req)
  const idempotency = requiredCommandIdempotency(req, {
    resourceType,
    resourceId,
    body,
  })

  return sendDocumentEmail(
    tenant(req),
    resourceType,
    resourceId,
    body,
    idempotency,
    {
      ...(withSourceApp ? { sourceAppId: sourceApp(req) } : {}),
      ...(actor(req) ? { actorId: actor(req) } : {}),
    }
  )
}

export const documentEmailController = {
  async invoicePrepare(req: Request, res: Response) {
    res.json(await prepare(req, 'invoice', 'invoiceId', false))
  },
  async invoiceSend(req: Request, res: Response) {
    res.json(await send(req, 'invoice', 'invoiceId', false))
  },
  async invoiceIntegrationPrepare(req: Request, res: Response) {
    res.json(await prepare(req, 'invoice', 'invoiceId', true))
  },
  async invoiceIntegrationSend(req: Request, res: Response) {
    res.json(await send(req, 'invoice', 'invoiceId', true))
  },
  async quotePrepare(req: Request, res: Response) {
    res.json(await prepare(req, 'quote', 'quoteId', false))
  },
  async quoteSend(req: Request, res: Response) {
    res.json(await send(req, 'quote', 'quoteId', false))
  },
  async quoteIntegrationPrepare(req: Request, res: Response) {
    res.json(await prepare(req, 'quote', 'quoteId', true))
  },
  async quoteIntegrationSend(req: Request, res: Response) {
    res.json(await send(req, 'quote', 'quoteId', true))
  },
}
