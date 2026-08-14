export const paymentProvidersDocs = {
  listCatalog: { summary: 'Billing GET /payment-providers' },
  listConnections: { summary: 'Billing GET /payment-providers/connections' },
  createConnection: { summary: 'Billing POST /payment-providers/connections' },
  updateConnection: {
    summary: 'Billing PATCH /payment-providers/connections/{connectionId}',
  },
} as const
