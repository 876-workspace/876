import { notepadWidgetMetadata } from '@876/widgets'

import { WidgetAccessList } from '@/components/widgets/widget-access-list'

export default function NotepadWidgetAccessPage() {
  return <WidgetAccessList widget={notepadWidgetMetadata} />
}
