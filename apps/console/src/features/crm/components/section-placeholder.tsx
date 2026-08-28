import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'

/**
 * Stands in for a record section that is routed but not built yet.
 *
 * The tab exists so the record's information architecture is settled and
 * linkable; saying plainly that the section is coming is what keeps a live tab
 * from reading as a broken one.
 */
export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="876-card">
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <span aria-hidden="true" className="text-lg">
              ·
            </span>
          </EmptyMedia>
          <EmptyTitle>{title} isn’t available yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
