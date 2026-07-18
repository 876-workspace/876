export const runtime = 'nodejs'

export function GET() {
  return Response.json({
    object: 'health',
    status: 'ok',
    service: 'billing',
  })
}
