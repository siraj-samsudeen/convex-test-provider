# Cache collision Specification

> GitHub Issue: [#2](https://github.com/siraj-samsudeen/convex-test-provider/issues/2)

## Overview

`ConvexTestProvider` currently computes its query cache key as `JSON.stringify({ query, args })`. When used with Convex's `anyApi` proxy, different query functions stringify to identical `{}` objects, so multiple `useQuery` calls in the same component can return each other's results. This specification defines the required behaviour and constraints for a corrected cache implementation.

## Requirements

### R1: Unique cache entries per `(query, args)` pair

Each distinct combination of query function reference and arguments must have its own cache entry. Two different query functions called with the same arguments must not share a cache slot.

### R2: Stable identity-based query key

The cache must use the query function's reference identity (the object/function itself) to distinguish queries, not its JSON representation or other lossy serialization.

### R3: Deterministic argument keying

For a given query function, calls with the same logical argument object should hit the same cache entry. For this package, it is acceptable to use `JSON.stringify(args ?? {})` as the argument key, assuming arguments are plain JSON-serializable data.

### R4: Backwards-compatible public API

The public `ConvexTestProvider` component and its `ConvexTestClient` interface must not change. Existing tests that use a single `useQuery` call or only `useMutation` should continue to pass.

### R5: Regression test for multiple `useQuery` calls

There must be at least one automated test that:

- Uses a component with two `useQuery` calls to different Convex queries, and
- Asserts that each hook receives data from its own query rather than the other, and
- Would fail against the pre-fix implementation.

## Constraints

### C1: Keep implementation small and readable

The fake client is intentionally minimal for use in tests. The new cache logic should remain simple and avoid unnecessary abstractions or deep dependency on Convex internals.

### C2: No behavioural change to mutation forwarding

The `mutation` path must continue to simply forward to `client.mutation` without additional caching or side effects.

## Acceptance Criteria

- [ ] A new failing test is added that demonstrates the cache collision when running against the old implementation.
- [ ] After the cache change, the new test passes and existing tests in `ConvexTestProvider.test.tsx` continue to pass.
- [ ] The implementation uses query function identity plus a deterministic arg key for caching, not `JSON.stringify({ query, args })`.
- [ ] The issue's described scenario (multiple `useQuery` calls in the same component) is no longer reproducible when using `ConvexTestProvider`.

