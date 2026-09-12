import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { optionalCommandIdempotency } from '@/http/command-idempotency'
import {
  integrationAttribution,
  type IntegrationAttribution,
} from '@/http/integration/idempotency'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { documentsService as service } from './documents.service'
import { recurringInvoicesService } from './recurring-invoices.service'
import type {
  CreditNoteApplyParams,
  CreditNoteCreateParams,
} from './schemas/credit-note'
import type {
  InvoiceCreateParams,
  InvoiceFinalizeParams,
  InvoiceStatus,
  InvoiceUpdateParams,
  InvoiceVoidParams,
  InvoiceWriteOffParams,
} from './schemas/invoice'
import type { InvoicePreferenceUpdateParams } from './schemas/invoice-preference'
import type { RecurringInvoiceFromInvoiceParams } from './schemas/recurring-invoice'
import type {
  QuoteCreateParams,
  QuoteStatus,
  QuoteUpdateParams,
} from './schemas/quote'
import type { QuotePreferenceUpdateParams } from './schemas/quote-preference'

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
function emptyCommand(req: Request, resourceId: string) {
  const body = validBody<Record<string, never>>(req)
  return {
    body,
    idempotency: optionalCommandIdempotency(req, { resourceId, body }),
  }
}
async function convertQuote(
  req: Request,
  res: Response,
  attribution?: IntegrationAttribution | null
) {
  const result = await service.convertQuoteToInvoice(
    tenant(req),
    param(req, 'quoteId'),
    attribution
  )
  res
    .status(result.replayed ? 200 : 201)
    .json({ object: result.object, id: result.id })
}

export const documentsController = {
  async invoicesList(req: Request, res: Response) {
    const query = validQuery<{
      status?: InvoiceStatus
      recurringInvoiceId?: string
    }>(req)
    res.json(
      await service.listInvoices(
        tenant(req),
        query.status,
        undefined,
        undefined,
        query.recurringInvoiceId
      )
    )
  },
  async invoicesIntegrationList(req: Request, res: Response) {
    const query = validQuery<{
      status?: InvoiceStatus
      recurringInvoiceId?: string
    }>(req)
    res.json(
      await service.listInvoices(
        tenant(req),
        query.status,
        sourceApp(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/invoices`,
        query.recurringInvoiceId
      )
    )
  },
  async invoicesGet(req: Request, res: Response) {
    res.json(await service.getInvoice(tenant(req), param(req, 'invoiceId')))
  },
  async invoicesIntegrationGet(req: Request, res: Response) {
    res.json(
      await service.getInvoice(
        tenant(req),
        param(req, 'invoiceId'),
        sourceApp(req)
      )
    )
  },
  async invoicesCreate(req: Request, res: Response) {
    const result = await service.createInvoice(
      tenant(req),
      validBody<InvoiceCreateParams>(req)
    )
    res.status(201).json(result.resource)
  },
  async invoicesIntegrationCreate(req: Request, res: Response) {
    const body = validBody<InvoiceCreateParams>(req)
    const attribution = integrationAttribution(
      req,
      getPrincipal(req),
      body as unknown as Record<string, unknown>
    )
    const result = await service.createInvoice(tenant(req), body, attribution)
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },
  async invoicesUpdate(req: Request, res: Response) {
    res.json(
      await service.updateInvoice(
        tenant(req),
        param(req, 'invoiceId'),
        validBody<InvoiceUpdateParams>(req)
      )
    )
  },
  async invoicesIntegrationUpdate(req: Request, res: Response) {
    res.json(
      await service.updateInvoice(
        tenant(req),
        param(req, 'invoiceId'),
        validBody<InvoiceUpdateParams>(req),
        sourceApp(req)
      )
    )
  },
  async invoicesFinalize(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<InvoiceFinalizeParams>(req)
    res
      .status(201)
      .json(
        await service.finalizeInvoice(
          tenant(req),
          invoiceId,
          body,
          undefined,
          optionalCommandIdempotency(req, { invoiceId, body })
        )
      )
  },
  async invoicesIntegrationFinalize(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<InvoiceFinalizeParams>(req)
    res.json(
      await service.finalizeInvoice(
        tenant(req),
        invoiceId,
        body,
        sourceApp(req),
        optionalCommandIdempotency(req, { invoiceId, body })
      )
    )
  },
  async invoicesSend(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<Record<string, never>>(req)
    res.json(
      await service.sendInvoice(
        tenant(req),
        invoiceId,
        undefined,
        optionalCommandIdempotency(req, { invoiceId, body })
      )
    )
  },
  async invoicesIntegrationSend(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<Record<string, never>>(req)
    res.json(
      await service.sendInvoice(
        tenant(req),
        invoiceId,
        sourceApp(req),
        optionalCommandIdempotency(req, { invoiceId, body })
      )
    )
  },
  async invoicesVoid(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<InvoiceVoidParams>(req)
    res
      .status(201)
      .json(
        await service.voidInvoice(
          tenant(req),
          invoiceId,
          body,
          undefined,
          optionalCommandIdempotency(req, { invoiceId, body })
        )
      )
  },
  async invoicesIntegrationVoid(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<InvoiceVoidParams>(req)
    res.json(
      await service.voidInvoice(
        tenant(req),
        invoiceId,
        body,
        sourceApp(req),
        optionalCommandIdempotency(req, { invoiceId, body })
      )
    )
  },
  async invoicesWriteOff(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<InvoiceWriteOffParams>(req)
    res.json(
      await service.writeOffInvoice(
        tenant(req),
        invoiceId,
        body,
        undefined,
        optionalCommandIdempotency(req, { invoiceId, body })
      )
    )
  },
  async invoicesIntegrationWriteOff(req: Request, res: Response) {
    const invoiceId = param(req, 'invoiceId')
    const body = validBody<InvoiceWriteOffParams>(req)
    res.json(
      await service.writeOffInvoice(
        tenant(req),
        invoiceId,
        body,
        sourceApp(req),
        optionalCommandIdempotency(req, { invoiceId, body })
      )
    )
  },
  async invoicesDelete(req: Request, res: Response) {
    res.json(await service.deleteInvoice(tenant(req), param(req, 'invoiceId')))
  },
  async invoicesClone(req: Request, res: Response) {
    res
      .status(201)
      .json(await service.cloneInvoice(tenant(req), param(req, 'invoiceId')))
  },
  async invoicesIntegrationClone(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.cloneInvoice(
          tenant(req),
          param(req, 'invoiceId'),
          sourceApp(req)
        )
      )
  },
  async invoicesMakeRecurring(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await recurringInvoicesService.createFromInvoice(
          tenant(req),
          param(req, 'invoiceId'),
          validBody<RecurringInvoiceFromInvoiceParams>(req)
        )
      )
  },
  async invoicesIntegrationMakeRecurring(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await recurringInvoicesService.createFromInvoice(
          tenant(req),
          param(req, 'invoiceId'),
          validBody<RecurringInvoiceFromInvoiceParams>(req),
          sourceApp(req)
        )
      )
  },
  async quotesList(req: Request, res: Response) {
    res.json(
      await service.listQuotes(
        tenant(req),
        validQuery<{ status?: QuoteStatus }>(req).status
      )
    )
  },
  async quotesIntegrationList(req: Request, res: Response) {
    res.json(
      await service.listQuotes(
        tenant(req),
        validQuery<{ status?: QuoteStatus }>(req).status
      )
    )
  },
  async quotesGet(req: Request, res: Response) {
    res.json(await service.getQuote(tenant(req), param(req, 'quoteId')))
  },
  async quotesIntegrationGet(req: Request, res: Response) {
    res.json(await service.getQuote(tenant(req), param(req, 'quoteId')))
  },
  async quotesCreate(req: Request, res: Response) {
    res.json(
      await service.createQuote(tenant(req), validBody<QuoteCreateParams>(req))
    )
  },
  async quotesIntegrationCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createQuote(
          tenant(req),
          validBody<QuoteCreateParams>(req)
        )
      )
  },
  async quotesUpdate(req: Request, res: Response) {
    res.json(
      await service.updateQuote(
        tenant(req),
        param(req, 'quoteId'),
        validBody<QuoteUpdateParams>(req)
      )
    )
  },
  async quotesDelete(req: Request, res: Response) {
    res.json(await service.deleteQuote(tenant(req), param(req, 'quoteId')))
  },
  async quotesSend(req: Request, res: Response) {
    const quoteId = param(req, 'quoteId')
    const command = emptyCommand(req, quoteId)
    res.json(
      await service.transitionQuote(
        tenant(req),
        quoteId,
        'send',
        command.idempotency
      )
    )
  },
  async quotesAccept(req: Request, res: Response) {
    const quoteId = param(req, 'quoteId')
    const command = emptyCommand(req, quoteId)
    res.json(
      await service.transitionQuote(
        tenant(req),
        quoteId,
        'accept',
        command.idempotency
      )
    )
  },
  async quotesDecline(req: Request, res: Response) {
    const quoteId = param(req, 'quoteId')
    const command = emptyCommand(req, quoteId)
    res.json(
      await service.transitionQuote(
        tenant(req),
        quoteId,
        'decline',
        command.idempotency
      )
    )
  },
  async quotesIntegrationAccept(req: Request, res: Response) {
    const quoteId = param(req, 'quoteId')
    const command = emptyCommand(req, quoteId)
    res.json(
      await service.transitionQuote(
        tenant(req),
        quoteId,
        'accept',
        command.idempotency,
        integrationAttribution(req, getPrincipal(req), command.body)
      )
    )
  },
  async quotesCancel(req: Request, res: Response) {
    const quoteId = param(req, 'quoteId')
    const command = emptyCommand(req, quoteId)
    res.json(
      await service.transitionQuote(
        tenant(req),
        quoteId,
        'cancel',
        command.idempotency
      )
    )
  },
  async quotesExpire(req: Request, res: Response) {
    const quoteId = param(req, 'quoteId')
    const command = emptyCommand(req, quoteId)
    res.json(
      await service.transitionQuote(
        tenant(req),
        quoteId,
        'expire',
        command.idempotency
      )
    )
  },
  async quotesConvertToInvoice(req: Request, res: Response) {
    await convertQuote(req, res)
  },
  async quotesIntegrationConvertToInvoice(req: Request, res: Response) {
    await convertQuote(
      req,
      res,
      integrationAttribution(
        req,
        getPrincipal(req),
        validBody<Record<string, never>>(req)
      )
    )
  },
  async quotePreferencesGet(req: Request, res: Response) {
    res.json(await service.getQuotePreferences(tenant(req)))
  },
  async quotePreferencesUpdate(req: Request, res: Response) {
    res.json(
      await service.updateQuotePreferences(
        tenant(req),
        validBody<QuotePreferenceUpdateParams>(req)
      )
    )
  },
  async creditNotesList(req: Request, res: Response) {
    res.json(
      await service.listCreditNotes(
        tenant(req),
        validQuery<{ status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'VOID' }>(req)
          .status
      )
    )
  },
  async creditNotesCreate(req: Request, res: Response) {
    res.json(
      await service.createCreditNote(
        tenant(req),
        validBody<CreditNoteCreateParams>(req)
      )
    )
  },
  async creditNotesApply(req: Request, res: Response) {
    res.json(
      await service.applyCreditNote(
        tenant(req),
        param(req, 'creditNoteId'),
        validBody<CreditNoteApplyParams>(req)
      )
    )
  },
  async creditNotesVoid(req: Request, res: Response) {
    res.json(
      await service.voidCreditNote(tenant(req), param(req, 'creditNoteId'))
    )
  },
  async preferencesGet(req: Request, res: Response) {
    res.json(await service.getPreferences(tenant(req)))
  },
  async preferencesUpdate(req: Request, res: Response) {
    res.json(
      await service.updatePreferences(
        tenant(req),
        validBody<InvoicePreferenceUpdateParams>(req)
      )
    )
  },
  async lateFees(req: Request, res: Response) {
    res.json(
      await service.assessLateFees(
        tenant(req),
        validBody<{ asOf?: number }>(req).asOf
      )
    )
  },
}
