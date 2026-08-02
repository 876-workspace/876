import { notepadWidgetMetadata } from '@876/widgets'

import { WidgetOverview } from '@/features/widgets/components/widget-overview'

export default function NotepadWidgetPage() {
  return <WidgetOverview widget={notepadWidgetMetadata} />
}
