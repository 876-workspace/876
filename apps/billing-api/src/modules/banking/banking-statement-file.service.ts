import { AppHttpError } from '@/http/errors'
import { enabledCurrencyDecimalPlaces } from '@/modules/currencies'

import * as repository from './banking-engine.repository'
import {
  previewDelimitedStatement,
  StatementFileParseError,
} from './banking-statement-file.parser'
import type { StatementFilePreviewBody } from './banking-statement-file.schemas'

function invalid(message: string) {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message,
    httpStatus: 422,
  })
}

export async function previewStatementFile(
  tenantId: string,
  accountId: string,
  body: StatementFilePreviewBody
) {
  const account = await repository.findEngineAccount(tenantId, accountId)
  if (!account)
    throw new AppHttpError({
      code: 'banking/bank-account-not-found',
      message: 'bank account not found.',
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
    const preview = previewDelimitedStatement({
      content: body.content,
      format: body.format,
      currency: body.currency,
      decimalPlaces,
      mapping: body.mapping,
    })

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
  } catch (error) {
    if (error instanceof StatementFileParseError) throw invalid(error.message)
    throw error
  }
}
