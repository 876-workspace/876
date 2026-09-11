import FeaturesListSlot from './page'

/**
 * A hard load of a record URL cannot recover the slot's active page, so the
 * list renders unfiltered — the same tree as the index page, so closing the
 * record does not reshape the column.
 */
export default function FeaturesListDefault({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return <FeaturesListSlot params={params} searchParams={Promise.resolve({})} />
}
