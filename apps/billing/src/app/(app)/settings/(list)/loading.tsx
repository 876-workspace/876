import { Page } from '@876/ui/page'

/**
 * The hub's heading is static chrome — it is known without resolving anything,
 * so it renders immediately rather than flashing an empty screen.
 *
 * The cards deliberately have no skeleton: which sections appear depends on the
 * viewer's permissions, so any fixed number of placeholders would be a guess
 * that shifts the layout when the real set arrives.
 */
export default function Loading() {
  return (
    <Page hub>
      <div className="mb-6">
        <h1 className="876-page-title">Settings</h1>
      </div>
    </Page>
  )
}
