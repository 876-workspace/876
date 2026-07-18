import { Building2 } from '@876/ui/icons'
import { PageBreadcrumb } from '@876/ui/page'

export default function OrgNotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Building2 className="text-muted-foreground size-7" />
      </div>
      <h1 className="876-page-title mb-2">Organization not found</h1>
      <p className="text-muted-foreground mb-8 max-w-xs text-sm">
        This organization doesn&apos;t exist or may have been removed.
      </p>
      <PageBreadcrumb href="/" label="Dashboard" className="mb-4 -ml-2.5" />
    </div>
  )
}
