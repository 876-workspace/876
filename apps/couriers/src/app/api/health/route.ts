export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  return Response.json({
    object: 'health',
    status: 'ok',
    service: 'couriers',
  })
}
