'use client'

import { SegmentError, type SegmentErrorProps } from '@876/ui/segment-error'

// Keeps the app shell mounted when a page below this layout throws while
// rendering, instead of escalating to global-error. It does not catch a throw
// from the layout beside it.
export default function ErrorBoundary(props: SegmentErrorProps) {
  return <SegmentError error={props.error} retry={props.retry} />
}
