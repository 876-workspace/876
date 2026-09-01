export const accountingProvidersDocs = {
  listProviders: { summary: 'List accounting providers' },
  listConnections: { summary: 'List organization accounting connections' },
  createConnection: { summary: 'Create an organization accounting connection' },
  retrieveConnection: { summary: 'Retrieve an accounting connection' },
  updateConnection: { summary: 'Update an accounting connection' },
  deleteConnection: { summary: 'Disable an accounting connection' },
  authorize: { summary: 'Start accounting provider authorization' },
  validate: { summary: 'Validate an accounting provider connection' },
  reconcile: { summary: 'Queue a full accounting provider reconciliation' },
  zohoCallback: { summary: 'Complete Zoho Books OAuth authorization' },
} as const
