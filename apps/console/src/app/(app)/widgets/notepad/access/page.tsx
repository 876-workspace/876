import { notepadWidgetMetadata } from '@876/widgets'

import { WidgetAccessList } from '@/features/widgets/components/widget-access-list'

export default function NotepadWidgetAccessPage() {
  return <WidgetAccessList widget={notepadWidgetMetadata} />
}
