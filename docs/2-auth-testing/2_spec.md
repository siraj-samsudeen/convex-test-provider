# Auth Testing Spec

> GitHub Issue: [#4](https://github.com/siraj-samsudeen/convex-test-provider/issues/4)

## Requirements

### Must have

1. `renderWithConvexAuth(ui, client)` renders components in authenticated state (default)
2. `renderWithConvexAuth(ui, client, { authenticated: false })` renders in unauthenticated state
3. `<Authenticated>` children render when authenticated, hidden when not
4. `<Unauthenticated>` children render when not authenticated, hidden when authenticated
5. `useConvexAuth()` returns correct `{ isLoading: false, isAuthenticated }` state
6. `useAuthActions()` does not throw (provides no-op `signIn`/`signOut`)
7. `useQuery`/`useMutation` still work inside auth-wrapped components
8. Existing `renderWithConvex` and `ConvexTestProvider` APIs unchanged (no breaking changes)

### Nice to have

1. `ConvexTestAuthProvider` exported as component for custom wrapping
2. `authenticated` prop on `ConvexTestProvider` for auth state without auth actions

## Acceptance Criteria

```
GIVEN a component using <Authenticated> and <Unauthenticated>
WHEN rendered with renderWithConvexAuth(ui, client)
THEN <Authenticated> children are visible and <Unauthenticated> children are hidden

GIVEN a component using <Authenticated> and <Unauthenticated>
WHEN rendered with renderWithConvexAuth(ui, client, { authenticated: false })
THEN <Unauthenticated> children are visible and <Authenticated> children are hidden

GIVEN a component using useAuthActions()
WHEN rendered with renderWithConvexAuth
THEN useAuthActions() does not throw and returns { signIn, signOut }

GIVEN a component using useConvexAuth()
WHEN rendered with renderWithConvexAuth(ui, client, { authenticated: true })
THEN useConvexAuth() returns { isLoading: false, isAuthenticated: true }

GIVEN existing tests using renderWithConvex
WHEN upgrading to v0.3.0
THEN all existing tests pass without changes
```
