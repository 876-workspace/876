import { redirect } from 'next/navigation'

export const runtime = 'nodejs'

export function GET() {
  redirect('/auth/complete')
}
