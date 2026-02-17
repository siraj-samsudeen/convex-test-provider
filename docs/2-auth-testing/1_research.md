# Auth Testing Research

> GitHub Issue: [#4](https://github.com/siraj-samsudeen/convex-test-provider/issues/4)

## Problem

Components using Convex auth hooks (`<Authenticated>`, `<Unauthenticated>`, `useConvexAuth()`, `useAuthActions()`) crash when rendered with `ConvexTestProvider` because the auth contexts are missing.

## Prior Art

### Phoenix/ExUnit

`log_in_user(conn, user)` creates a real user and session token, injects it into the test session. The full auth pipeline runs — no mocking. Login pages tested with integration/browser tests separately.

```elixir
setup :register_and_log_in_user

test "dashboard shows user content", %{conn: conn} do
  {:ok, view, html} = live(conn, "/dashboard")
  assert html =~ "Welcome"
end
```

### Rails/DHH

`sign_in(user)` sets Warden session directly — not a mock, a shortcut into the real auth layer. Skips HTTP ceremony, keeps the entire system real.

> "Test the interface, not the implementation."

### Mapping to React + Convex

| Phoenix/Rails | Convex equivalent |
|---|---|
| `log_in_user(conn, user)` | `renderWithConvexAuth(<App />, client)` |
| `build_conn()` (no session) | `renderWithConvexAuth(<App />, client, { authenticated: false })` |
| `get(conn, "/")` | Component renders with auth context present |

## Convex Auth Architecture

### Provider hierarchy (production)

```
ConvexAuthProvider (@convex-dev/auth/react)
  ├─ ConvexAuthActionsContext  →  { signIn, signOut }     ← useAuthActions()
  ├─ ConvexAuthInternalContext →  { isLoading, isAuthenticated }
  ├─ ConvexAuthTokenContext    →  JWT string | null
  │
  └─ ConvexProviderWithAuth (convex/react)
     └─ ConvexAuthContext      →  { isLoading, isAuthenticated }  ← useConvexAuth()
        └─ ConvexProvider      →  client                          ← useQuery/useMutation
```

### Key finding: `ConvexProviderWithAuth`

Publicly exported from `convex/react`. Accepts a custom `useAuth` hook:

```ts
useAuth: () => {
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: ({ forceRefreshToken }) => Promise<string | null>;
}
```

Calls `client.setAuth(fetchToken, onChange)` and `client.clearAuth()` in effects.

### Key finding: `ConvexAuthActionsContext`

Exported from `@convex-dev/auth/dist/react/client.js` (internal path, not public API). Used by `useAuthActions()` hook.

### What `<Authenticated>` and `<Unauthenticated>` do

```js
function Authenticated({ children }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading || !isAuthenticated) return null;
  return children;
}
```

Both read from `ConvexAuthContext` provided by `ConvexProviderWithAuth`.

## Approach

1. Use `ConvexProviderWithAuth` with a custom `useAuth` hook returning fixed auth state
2. Add `setAuth`/`clearAuth` stubs to the fake client
3. Wrap with `ConvexAuthActionsContext` for `useAuthActions()` support
4. `@convex-dev/auth` as optional peer dep (internal import path with TODO for public export)
