import {
  assertLegacyBillingWriteAllowed,
  LegacyBillingWriterInactiveError,
} from './write-guard'

describe('assertLegacyBillingWriteAllowed', () => {
  it('allows reads regardless of the active writer', () => {
    expect(() =>
      assertLegacyBillingWriteAllowed('findMany', 'none')
    ).not.toThrow()
    expect(() =>
      assertLegacyBillingWriteAllowed('findUnique', 'fastapi')
    ).not.toThrow()
  })

  it('allows mutations only while legacy owns writes', () => {
    expect(() =>
      assertLegacyBillingWriteAllowed('create', 'legacy')
    ).not.toThrow()
    expect(() =>
      assertLegacyBillingWriteAllowed('updateMany', 'fastapi')
    ).toThrow(LegacyBillingWriterInactiveError)
    expect(() => assertLegacyBillingWriteAllowed('delete', 'none')).toThrow(
      'The legacy Billing backend is not the active writer.'
    )
  })
})
