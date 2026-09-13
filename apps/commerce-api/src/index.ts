import { createApp } from './application.js'

// Vercel invokes the default export as the request handler. Exporting the
// factory type-checks and deploys, but every request then hangs unanswered.
export default createApp()
