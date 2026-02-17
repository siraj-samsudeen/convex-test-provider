# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Cache collision when multiple `useQuery` calls share a component — different query references (e.g. `api.items.list` and `api.todos.list`) now get separate cache entries instead of overwriting each other (#2)
- `seed` fixture now respects explicit `userId` in data instead of always overwriting with the default user (#8)
- `createUser` now exposes `userId` on the returned client for multi-user test scenarios (#8)

### Changed

- `signIn`/`signOut` from `useAuthActions()` now toggle auth state in tests (previously no-ops) (#6)
- Added `signInError` option to `renderWithConvexAuth` for simulating sign-in failures (#6)

### Added

- Limitations section in README — documents one-shot query model and upstream `convex-test` auth context limitation (#7)

## [0.3.0]

### Added

- `ConvexTestAuthProvider` component — wraps with auth state and auth actions context
- `renderWithConvexAuth(ui, client, opts?)` helper — renders components using `<Authenticated>`, `<Unauthenticated>`, `useConvexAuth()`, and `useAuthActions()`
- `authenticated` prop on `ConvexTestProvider` — enables auth-aware wrapping via `ConvexProviderWithAuth`
- `@convex-dev/auth` as optional peer dependency

## [0.2.0]

### Added

- `createConvexTest(schema, modules, opts?)` — vitest fixtures for authenticated client, seed, createUser
- `renderWithConvex(ui, client)` — Testing Library render with Convex provider
- `wrapWithConvex(children, client)` — JSX wrapper for custom rendering

## [0.1.0] - (initial release)

- `ConvexTestProvider` component and `ConvexTestClient` type
- Adapts convex-test one-shot client to ConvexProvider for `useQuery` / `useMutation` in tests
