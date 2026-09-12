import { notepadWidgetMetadata } from '@876/widgets'

import { WidgetAccessList } from '@/features/access/components/widget-access-list'

export const metadata = { title: 'Notepad Access' }

export default function NotepadWidgetAccessPage() {
  return <WidgetAccessList widget={notepadWidgetMetadata} />
}
