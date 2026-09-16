export type IntegrationClient = {
  object: 'projects.integration-client'
  id: string
  name: string
  scopes: string[]
  lastUsedAt: number | null
  revokedAt: number | null
  createdAt: number
}

export type WebhookEndpoint = {
  object: 'projects.webhook-endpoint'
  id: string
  url: string
  eventTypes: string[]
  enabled: boolean
  consecutiveFailures: number
  hasSecret: boolean
  updatedAt: number
}

export type WebhookDelivery = {
  object: 'projects.webhook-delivery'
  id: string
  endpointId: string
  eventId: string
  eventType: string
  attempt: number
  status: 'pending' | 'succeeded' | 'failed'
  responseCode: number | null
  nextAttemptAt: number | null
  createdAt: number
}

export type ImportJob = {
  object: 'projects.import-job'
  id: string
  source: 'csv' | 'jira-csv' | 'jira-json' | 'trello-json' | 'asana-csv' | 'zoho-csv'
  status: 'previewing' | 'ready' | 'committing' | 'completed' | 'failed'
  rowCount: number
  errorCount: number
  importedCount: number
  createdAt: number
}

export type ImportRowPreview = {
  rowNumber: number
  title: string | null
  status: 'valid' | 'invalid'
  errors: string[]
}

export type UnmappedField = {
  source: string
  field: string
  occurrences: number
}

export type MetricsSummary = {
  object: 'projects.metrics-summary'
  windows: {
    window: '24h' | '7d'
    automationRuns: { total: number; failed: number }
    webhookDeliveries: { total: number; failed: number }
    importJobs: { total: number; failed: number }
  }[]
}
