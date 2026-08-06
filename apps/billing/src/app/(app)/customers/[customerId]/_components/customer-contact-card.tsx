import { Mail, ShieldCheck } from '@876/ui/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'

import {
  DetailAccordionCard,
  Fact,
  FactGrid,
} from '@/components/patterns/detail/detail-accordion'

import type { PrimaryContact } from '../_data'
import { initialsOf, SOURCE_LABEL } from '../_lib/customer-detail-helpers'

export function CustomerContactCard({
  contact,
}: {
  contact: PrimaryContact | null
}) {
  return (
    <DetailAccordionCard title="Contact" icon={Mail} tone="sky">
      {!contact ? (
        <p className="text-muted-foreground py-2 text-sm">
          No contact details.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 text-sm">
              {contact.avatar ? (
                <AvatarImage src={contact.avatar} alt="" />
              ) : null}
              <AvatarFallback>{initialsOf(contact.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{contact.name}</p>
              <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                {contact.role ? (
                  <>
                    <ShieldCheck className="size-3 shrink-0" />
                    {contact.role}
                    <span aria-hidden="true">·</span>
                  </>
                ) : null}
                {SOURCE_LABEL[contact.source]}
              </p>
            </div>
          </div>
          <FactGrid>
            <Fact label="Email" value={contact.email || '—'} />
            <Fact label="Phone" value={contact.phone || '—'} />
          </FactGrid>
        </div>
      )}
    </DetailAccordionCard>
  )
}
