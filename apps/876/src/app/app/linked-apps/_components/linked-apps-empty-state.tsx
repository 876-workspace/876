import { ShieldCheck } from '@876/ui/icons'

export function LinkedAppsEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.25rem] border border-dashed p-8 text-center">
      <ShieldCheck
        aria-hidden="true"
        className="size-9 text-[color:var(--876-green)]"
      />
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
    </div>
  )
}
