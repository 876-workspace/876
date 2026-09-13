export const salesOrdersDocs = {
  list: {
    summary: 'List Sales Orders',
    description:
      'Lists tenant Sales Orders with independent commercial, payment, and fulfillment status filters.',
  },
  create: {
    summary: 'Create Sales Order',
    description:
      'Creates a draft Sales Order and snapshots resolved sellable and pricing facts on each line.',
  },
  retrieve: {
    summary: 'Retrieve Sales Order',
    description: 'Retrieves one Sales Order and its immutable line snapshots.',
  },
  update: {
    summary: 'Update Sales Order',
    description:
      'Updates a draft Sales Order. Commercial-context changes must include refreshed lines.',
  },
  del: {
    summary: 'Delete Sales Order',
    description: 'Deletes a Sales Order while it is still a draft.',
  },
  submit: {
    summary: 'Submit Sales Order',
    description: 'Moves a draft Sales Order to pending.',
  },
  confirm: {
    summary: 'Confirm Sales Order',
    description: 'Confirms a pending Sales Order.',
  },
  startProcessing: {
    summary: 'Start Sales Order Processing',
    description: 'Moves a confirmed Sales Order to processing.',
  },
  complete: {
    summary: 'Complete Sales Order',
    description: 'Completes a processing Sales Order.',
  },
  cancel: {
    summary: 'Cancel Sales Order',
    description: 'Cancels a Sales Order that has not already completed.',
  },
} as const
