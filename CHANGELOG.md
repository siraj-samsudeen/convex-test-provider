# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
