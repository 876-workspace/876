// Test stub for the `server-only` guard. The real package throws when a module
// graph is evaluated outside a server context, which is exactly what Vitest
// does when it imports a service module that reaches a server-only client.
export {}
