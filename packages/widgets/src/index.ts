export {
  getRequiredWidgetFeatureSlugs,
  getWidgetAppFeatureKeys,
  getWidgetFeatureSlugs,
  getWidgetMetadata,
  getWidgetPlatformFeatureKeys,
  isWidgetEnabled,
  isWidgetsDataOwner,
  notepadWidgetMetadata,
  WIDGET_HOST_APP_SLUGS,
  widgetCatalog,
} from './catalog'
export type {
  WidgetDataOwner,
  WidgetDistribution,
  WidgetFeatureKeys,
  WidgetHost,
  WidgetMetadata,
  WidgetVisual,
} from './catalog'
export type { WidgetSize, WidgetSizePolicy } from './types/widget-size'
export {
  WIDGET_WIDTHS,
  RAIL_WIDTH_PX,
  resolveWidgetWidth,
  normalizeSizePolicy,
  canDockAtWidth,
  isWidgetSize,
  WIDGET_SIZES,
  WIDGET_SIZE_LABELS,
} from './types/widget-size'
export type {
  DeletedNote,
  NoteColor,
  NoteList,
  NotepadNote,
} from './types/notes'
