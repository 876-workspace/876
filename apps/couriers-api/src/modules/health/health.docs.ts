export const HEALTH_SUMMARY = 'Check API health'
export const HEALTH_DESCRIPTION =
  'Returns a lightweight liveness response. No authentication required.'
export const HEALTH_RESPONSES = {
  200: {
    description: 'The API process is running.',
    example: {
      data: { object: 'health', status: 'ok', service: '@876/couriers-api' },
      error: null,
    },
  },
} as const
