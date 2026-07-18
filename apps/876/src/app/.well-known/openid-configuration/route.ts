import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

export async function GET(request: NextRequest) {
  const res = await fetch(`${API_URL}/oauth/.well-known/openid-configuration`, {
    headers: { host: request.nextUrl.host },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
