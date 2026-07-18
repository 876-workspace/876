# @876/sdk

Request-only JavaScript SDK for 876 auth and OAuth flows.

The SDK validates request parameters, sends fetch requests to the 876 API, validates responses, and returns typed result envelopes. It does not own cookies, redirects, session stores, database access, or provider server calls.

## Install

Inside this monorepo:

```bash
pnpm add @876/sdk --filter @876/app --workspace
```

External consumers install the published package once it is released:

```bash
pnpm add @876/sdk
```

## Basic Auth Usage

```ts
import { create876Client } from '@876/sdk'

const $876 = create876Client()

const result = await $876.auth.login({
  identifier: 'alejandra@example.com',
  password: 'secure-password',
})

if (result.error) {
  console.error(result.error.code, result.error.message)
  return
}

if (result.data.object === 'auth_event') {
  console.log('Email verification required', result.data.email)
  return
}

console.log('Signed in as', result.data.user.email)
```

## Result Envelope

Every auth SDK method returns:

```ts
type Result<T> = { data: T; error: null } | { data: null; error: AuthError }
```

Always check `result.error` before reading `result.data`.

## Errors

SDK-created errors are centralized under `src/errors/` and exposed through
`@876/sdk/errors`.

```ts
import { createAuthError } from '@876/sdk/errors'

const error = createAuthError('auth/missing-identifier')
// { code: 'auth/missing-identifier', message: 'Please enter your username or email.' }
```

The SDK-local auth registry only includes errors the SDK creates itself, such as
missing inputs, malformed responses, and network failures. Backend-only auth
errors can still pass through from the API with their API-provided message.

## Auth Methods

| Method                                         | Route                          | Purpose                        |
| ---------------------------------------------- | ------------------------------ | ------------------------------ |
| `$876.auth.resolve(params, options?)`          | `POST /auth/resolve`           | Resolve email or username.     |
| `$876.auth.login(params, options?)`            | `POST /auth/login`             | Password login.                |
| `$876.auth.register(params, options?)`         | `POST /auth/register`          | Consumer account registration. |
| `$876.auth.registerBusiness(params, options?)` | `POST /auth/register-business` | Business owner registration.   |
| `$876.auth.socialLogin(params, options?)`      | `POST /auth/social-login`      | Start provider login.          |
| `$876.auth.verifyEmailCode(params, options?)`  | `POST /auth/verify-email`      | Complete email verification.   |
| `$876.auth.recover(params, options?)`          | `POST /auth/recover`           | Request password reset.        |
| `$876.auth.resetPassword(params, options?)`    | `POST /auth/reset-password`    | Complete password reset.       |
| `$876.auth.logout(params?, options?)`          | `POST /auth/logout`            | End session.                   |
| `$876.auth.getSession(options?)`               | `GET /auth/session`            | Read current session.          |
| `$876.auth.sendMagicOtp(params, options?)`     | `POST /auth/magic-otp/send`    | Send one-time code.            |
| `$876.auth.verifyMagicOtp(params, options?)`   | `POST /auth/magic-otp/verify`  | Complete OTP login.            |

## OAuth Usage

```ts
import { createOAuthClient, generatePkce } from '@876/sdk'

const oauth = createOAuthClient({
  baseUrl: 'https://app.876.dev',
  clientId: 'app_123',
  redirectUri: 'https://example.com/oauth/callback',
})

const { codeVerifier, codeChallenge } = await generatePkce()

const authorization = oauth.getAuthorizationUrl({
  scope: ['openid', 'profile', 'email'],
  codeChallenge,
  state: crypto.randomUUID(),
})

if (authorization.error) throw new Error(authorization.error.message)

window.location.assign(authorization.data)
```

Server-side token exchange:

```ts
const token = await oauth.exchangeCodeForToken({
  code,
  codeVerifier,
})

if (token.error) return token

const userInfo = await oauth.getUserInfo({
  accessToken: token.data.access_token,
})
```

Do not expose `clientSecret` in browser bundles.

## Base URL Behavior

`create876Client()` resolves the API base URL internally:

| Runtime                              | Base URL                           |
| ------------------------------------ | ---------------------------------- |
| Explicit `baseUrl`                   | `baseUrl`                          |
| `NEXT_PUBLIC_876_API_URL` configured | `NEXT_PUBLIC_876_API_URL`          |
| `NEXT_PUBLIC_API_URL` configured     | `NEXT_PUBLIC_API_URL`              |
| Codespaces browser dev without env   | matching forwarded `4000`          |
| Local development without env        | `http://localhost:4000`            |
| Production without env               | `https://eight76-api.onrender.com` |

## Full Documentation

See `../../apps/docs/content/docs/index.mdx` for the full method reference, examples, types, and error codes.

## Package Commands

```bash
pnpm --filter @876/sdk typecheck
pnpm --filter @876/sdk test
pnpm --filter @876/sdk build
pnpm --filter @876/sdk check
```
