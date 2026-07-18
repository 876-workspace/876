import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

export async function GET() {
  const res = await fetch(`${API_URL}/oauth/.well-known/jwks.json`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
