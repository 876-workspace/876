// The dependency-free retry script every offline fallback loads.
//
// Bundled to `public/pwa/offline-recovery.js` by `build-pwa-assets.mjs` and
// precached, so it is available before any application chunk is. The logic
// lives in `@876/ui` so it can be unit tested; this file is only the entry
// point esbuild compiles.

import { startOfflineRecovery } from '../packages/ui/src/lib/offline-recovery-runtime'

startOfflineRecovery()
