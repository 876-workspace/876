/** A read result that is either the 876 session value or a thrown error. */
export type Session876Result<T> = T | Error

/** User shape surfaced from the session cookie. */
export type SessionUser = {
  id: string
  email: string
  /** Account realm; the enterprise app admits `enterprise` sessions only. */
  realm?: 'consumer' | 'enterprise'
  /** Realm-gate exception: when true this account may use any app/realm. */
  crossRealm?: boolean
  firstName?: string | null
  lastName?: string | null
  emailVerified?: boolean
  avatar?: string | null
  username?: string | null
}

/** A signed-in 876 session. */
export type Signed876Session = {
  user: SessionUser
  accessToken?: string
}

/** Current 876 session — either signed-in or not. */
export type Current876Session = Signed876Session | { user: null }
