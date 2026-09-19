import { NextResponse, type NextRequest } from 'next/server'

export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueRef: string }> }
): Promise<NextResponse> {
  return params.then(({ issueRef }) => {
    const ref = encodeURIComponent(decodeURIComponent(issueRef))
    return NextResponse.redirect(new URL(`/issues/${ref}`, request.url), 308)
  })
}
