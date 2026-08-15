export const customersDocs = {
  list: { summary: 'List Billing customers' },
  retrieve: { summary: 'Retrieve a Billing customer' },
  create: { summary: 'Create a Billing customer' },
  update: { summary: 'Update a Billing customer' },
  del: { summary: 'Delete a Billing customer' },
  account: { summary: 'Retrieve a customer account' },
  link: { summary: 'Link a customer to a Core party' },
  unlink: { summary: 'Unlink a customer from Core' },
  openingBalance: { summary: 'Record a dated customer opening balance' },
  importRows: { summary: 'Import Billing customers' },
  ensure: { summary: 'Idempotently ensure a customer' },
} as const
