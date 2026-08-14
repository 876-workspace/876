export const taxDocs = {
  listAuthorities: { summary: 'Billing GET /tax-authorities' },
  createAuthority: { summary: 'Billing POST /tax-authorities' },
  updateAuthority: {
    summary: 'Billing PATCH /tax-authorities/{taxAuthorityId}',
  },
  listRates: { summary: 'Billing GET /tax-rates' },
  createRate: { summary: 'Billing POST /tax-rates' },
  updateRate: { summary: 'Billing PATCH /tax-rates/{taxRateId}' },
} as const
