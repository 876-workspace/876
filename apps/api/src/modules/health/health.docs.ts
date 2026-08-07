/**
 * OpenAPI prose for the Health module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const HEALTH_SUMMARY = 'Check API health'

export const HEALTH_DESCRIPTION =
  'Returns a lightweight liveness response. No authentication required.'

export const HEALTH_RESPONSES = {
  200: {
    description: 'The API process is running.',
    example: { object: 'health', status: 'ok', service: '@876/api' },
  },
} as const
