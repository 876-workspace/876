import { StreamingResourceLoading } from '@/components/patterns/streaming-resource-page'
import { CATALOG_LISTS } from '../../_components/catalog-list-config'

export default function Loading() {
  return <StreamingResourceLoading {...CATALOG_LISTS.products} status="all" />
}
