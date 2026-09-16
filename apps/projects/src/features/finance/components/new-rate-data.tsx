import { RateForm } from './rate-form'

export function NewRateData({ projectId }: { projectId: string }) {
  return <RateForm mode="create" projectId={decodeURIComponent(projectId)} />
}
