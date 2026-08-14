export const currenciesDocs = {
  list: { summary: 'Billing GET /currencies' },
  create: { summary: 'Billing POST /currencies' },
  setDefault: { summary: 'Billing PATCH /currencies' },
  update: { summary: 'Billing PATCH /currencies/{code}' },
  remove: { summary: 'Billing DELETE /currencies/{code}' },
} as const
