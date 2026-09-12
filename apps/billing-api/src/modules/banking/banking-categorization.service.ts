import { AppHttpError } from '@/http/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import { retrieveStatementLine } from './banking-engine.service'
import { uncategorizeManualStatementLineRow } from './banking-categorization.repository'

export async function uncategorizeStatementLine(
  tenantId: string,
  lineId: string
) {
  const result = await uncategorizeManualStatementLineRow(
    tenantId,
    lineId,
    nowUnixSeconds()
  )

  if (result.kind === 'missing')
    throw new AppHttpError({
      code: 'banking/invalid-state',
      message: 'Only Banking-created categorized statement lines can be uncategorized.',
      httpStatus: 409,
    })
  if (result.kind === 'invalid')
    throw new AppHttpError({
      code: 'banking/invalid-state',
      message: 'This categorization cannot be reversed safely.',
      httpStatus: 409,
    })
  if (result.kind === 'in-use')
    throw new AppHttpError({
      code: 'banking/categorization-in-use',
      message:
        'This categorized cash movement is already used by reconciliation or a deposit and cannot be removed.',
      httpStatus: 409,
    })

  return {
    statementLine: await retrieveStatementLine(tenantId, lineId),
    removedBankTransactionId: result.bankTransactionId,
  }
}
