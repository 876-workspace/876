import { AppHttpError } from '@/http/errors'
import { enabledCurrencyDecimalPlaces } from '@/modules/currencies'

import * as repository from './banking-engine.repository'
import { createStatementImport } from './banking-engine.service'
import {
  previewDelimitedStatement,
  StatementFileParseError,
} from './banking-statement-file.parser'
import type {
  StatementFileImportBody,
  StatementFilePreviewBody,
} from './banking-statement-file.schemas'

function invalid(message: string) {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message,
    httpStatus: 422,
  })
}

async function normalizedPreview(
  tenantId: string,
  accountId: string,
  body: StatementFilePreviewBody
) {
  const account = await repository.findEngineAccount(tenantId, accountId)
  if (!account)
    throw new AppHttpError({
      code: 'banking/bank-account-not-found',
      message: 'Bank account not found.',
      httpStatus: 404,
    })
  if (account.currency !== body.currency)
    throw invalid('The statement currency must match the bank account currency.')

  const decimalPlaces = await enabledCurrencyDecimalPlaces(
    tenantId,
    body.currency
  )
  if (decimalPlaces === null)
    throw invalid('Enable the statement currency before importing it.')

  try {
    return previewDelimitedStatement({
      content: body.content,
      format: body.format,
      currency: body.currency,
      decimalPlaces,
      mapping: body.mapping,
    })
  } catch (error) {
    if (error instanceof StatementFileParseError) throw invalid(error.message)
    throw error
  }
}

export async function previewStatementFile(
  tenantId: string,
  accountId: string,
  body: StatementFilePreviewBody
) {
  const preview = await normalizedPreview(tenantId, accountId, body)

  return {
    object: 'bank-statement-preview' as const,
    accountId,
    format: body.format,
    currency: body.currency,
    headers: preview.headers,
    totalRows: preview.totalRows,
    validRows: preview.lines.length,
    invalidRows: preview.errors.length,
    lines: preview.lines,
    errors: preview.errors,
  }
}

/**
 * Re-runs the exact preview parser before persistence so the client cannot turn
 * an edited preview into trusted bank evidence. Raw file bytes remain outside
 * Billing; `sourceFileId` is an opaque 876 Storage reference when supplied.
 */
export async function importStatementFile(
  tenantId: string,
  accountId: string,
  body: StatementFileImportBody,
  actorId: string | null
) {
  const preview = await normalizedPreview(tenantId, accountId, body)
  if (preview.errors.length)
    throw invalid(
      `The statement contains ${preview.errors.length} invalid row${preview.errors.length === 1 ? '' : 's'}. Preview and correct the mapping before importing.`
    )
  if (!preview.lines.length)
    throw invalid('The statement does not contain any importable transactions.')

  return createStatementImport(
    tenantId,
    accountId,
    {
      source: 'file',
      format: body.format,
      sourceFileId: body.sourceFileId ?? null,
      sourceName: body.sourceName ?? null,
      mapping: body.mapping,
      lines: preview.lines.map(({ sourceRowNumber: _sourceRowNumber, ...line }) => ({
        ...line,
        amount: BigInt(line.amount),
        runningBalance:
          line.runningBalance === null ? null : BigInt(line.runningBalance),
      })),
    },
    actorId
  )
}
