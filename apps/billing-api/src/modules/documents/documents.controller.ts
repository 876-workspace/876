import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { integrationAttribution } from '@/http/integration/idempotency'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { documentsService as service } from './documents.service'
import type {
  CreditNoteApplyParams,
  CreditNoteCreateParams,
} from './schemas/credit-note'
import type {
  EstimateCreateParams,
  EstimateStatus,
  EstimateUpdateParams,
} from './schemas/estimate'
import type {
  InvoiceCreateParams,
  InvoiceFinalizeParams,
  InvoiceStatus,
  InvoiceUpdateParams,
  InvoiceVoidParams,
} from './schemas/invoice'
import type { InvoicePreferenceUpdateParams } from './schemas/invoice-preference'
import type {
  QuoteCreateParams,
  QuoteStatus,
  QuoteUpdateParams,
} from './schemas/quote'

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
export const documentsController = {
  async invoicesList(req: Request, res: Response) {
    res.json(
      await service.listInvoices(
        tenant(req),
        validQuery<{ status?: InvoiceStatus }>(req).status
      )
    )
  },
  async invoicesIntegrationList(req: Request, res: Response) {
    res.json(
      await service.listInvoices(
        tenant(req),
        validQuery<{ status?: InvoiceStatus }>(req).status,
        sourceApp(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/invoices`
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
    res
      .status(201)
      .json(
        await service.finalizeInvoice(
          tenant(req),
          param(req, 'invoiceId'),
          validBody<InvoiceFinalizeParams>(req)
        )
      )
  },
  async invoicesIntegrationFinalize(req: Request, res: Response) {
    res.json(
      await service.finalizeInvoice(
        tenant(req),
        param(req, 'invoiceId'),
        validBody<InvoiceFinalizeParams>(req),
        sourceApp(req)
      )
    )
  },
  async invoicesVoid(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.voidInvoice(
          tenant(req),
          param(req, 'invoiceId'),
          validBody<InvoiceVoidParams>(req)
        )
      )
  },
  async invoicesIntegrationVoid(req: Request, res: Response) {
    res.json(
      await service.voidInvoice(
        tenant(req),
        param(req, 'invoiceId'),
        validBody<InvoiceVoidParams>(req),
        sourceApp(req)
      )
    )
  },
  async invoicesDelete(req: Request, res: Response) {
    res.json(await service.deleteInvoice(tenant(req), param(req, 'invoiceId')))
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
  async estimatesList(req: Request, res: Response) {
    res.json(
      await service.listEstimates(
        tenant(req),
        validQuery<{ status?: EstimateStatus }>(req).status
      )
    )
  },
  async estimatesGet(req: Request, res: Response) {
    res.json(await service.getEstimate(tenant(req), param(req, 'estimateId')))
  },
  async estimatesCreate(req: Request, res: Response) {
    res.json(
      await service.createEstimate(
        tenant(req),
        validBody<EstimateCreateParams>(req)
      )
    )
  },
  async estimatesUpdate(req: Request, res: Response) {
    res.json(
      await service.updateEstimate(
        tenant(req),
        param(req, 'estimateId'),
        validBody<EstimateUpdateParams>(req)
      )
    )
  },
  async estimatesDelete(req: Request, res: Response) {
    res.json(
      await service.deleteEstimate(tenant(req), param(req, 'estimateId'))
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
