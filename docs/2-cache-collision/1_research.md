# Cache collision in ConvexTestProvider

> GitHub Issue: [#2](https://github.com/siraj-samsudeen/convex-test-provider/issues/2)

## Context

When a React component uses multiple `useQuery` calls under `ConvexTestProvider`, the internal cache in the fake client can return the wrong data to a query hook. This shows up as type mismatches at runtime (e.g. an array query receiving a string result) and can crash components.

## Ecosystems Consulted

- Convex React client patterns — Convex uses function identity and structured serialization internally to distinguish queries and their arguments in its watcher cache.

## Options Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Keep `JSON.stringify({ query, args })` but patch convex-test client | Minimal code change | `anyApi` proxies stringify to `{}`, so different functions still collide; brittle and tied to current convex internals | Rejected |
| Use `JSON.stringify` only on `args` and use function reference identity for the query key (nested `Map`) | Fixes collisions between different query functions; keeps simple, deterministic key for args | Still relies on `JSON.stringify` for args equality; acceptable for test-only client but not perfect generalization | **Chosen** |
| Assign synthetic IDs per `watchQuery` call (pure identity-based cache) | Guaranteed no collisions | Loses sharing between identical `(query, args)` calls; harder to reason about cache behaviour | Rejected |
| Try to reach into Convex internals to read the query path/name | Would exactly match real Convex client behaviour | Couples this package to Convex private APIs; more fragile than necessary | Rejected |

## Key Q&A

**Q:** Why is there a collision when using multiple `useQuery` calls with no args?  
**A:** The current implementation serializes the `query` function via `JSON.stringify` when building the cache key. Convex's `anyApi` proxy produces function objects that stringify to `"{}"`, so all such functions share the same serialized representation. With no args, every query shares the same key and overwrites each other's cache entries.

**Q:** Do we need to exactly match Convex's production cache semantics?  
**A:** No. This provider is a thin adapter around `convex-test` for component tests. We only need stable, non-colliding keys per `(query, args)` pair and behaviour that is close enough that React hooks see the right data.

**Q:** Why not use deep equality on `args` instead of `JSON.stringify`?  
**A:** For this test helper a simple `JSON.stringify` on `args` is sufficient and keeps the implementation small. If future tests need more robust arg handling we can iterate, but the root problem here is query-function collisions, which using function identity directly solves.

## Final Design

Use a two-level cache keyed by query function identity and by a stringified `args` key:

- Replace the single `Map<string, unknown>` cache with `Map<unknown, Map<string, unknown>>`.
- In `watchQuery`, look up (or create) the inner `Map` for the `query` function.
- Compute `const argsKey = JSON.stringify(args ?? {})`.
- Store and read results from `queryCache.get(argsKey)` / `set(argsKey, result)`.

This preserves sharing for identical `(query, args)` pairs while preventing collisions between different query functions that previously serialized to the same JSON string.

