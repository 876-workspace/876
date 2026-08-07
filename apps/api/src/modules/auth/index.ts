/**
 * The `auth` module's public surface.
 *
 * The module owns only what the FastAPI router owned — reading the request,
 * sealing the session cookie, status codes, serialization. Login, registration,
 * OTP, recovery, verification, code exchange and refresh all live in
 * `@/services/auth`.
 */
export { createAuthRouter } from './auth.routes'
