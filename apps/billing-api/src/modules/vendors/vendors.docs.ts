export const vendorsDocs = {
  list: {
    summary: 'Billing GET /vendors',
    description: 'Lists tenant vendors.',
  },
  retrieve: {
    summary: 'Billing GET /vendors/{vendorId}',
    description: 'Retrieves a tenant vendor.',
  },
  create: {
    summary: 'Billing POST /vendors',
    description: 'Creates a tenant vendor.',
  },
  update: {
    summary: 'Billing PATCH /vendors/{vendorId}',
    description: 'Updates a tenant vendor.',
  },
  del: {
    summary: 'Billing DELETE /vendors/{vendorId}',
    description: 'Deletes a tenant vendor.',
  },
} as const
