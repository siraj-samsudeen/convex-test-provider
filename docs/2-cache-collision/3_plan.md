# Cache collision Implementation Plan

> GitHub Issue: [#2](https://github.com/siraj-samsudeen/convex-test-provider/issues/2)

## Files to Modify

- `src/ConvexTestProvider.tsx` — update the cache implementation used by the fake client.
- `src/ConvexTestProvider.test.tsx` — add a regression test that uses multiple `useQuery` calls in a single component.

## Implementation Steps

### Step 1: Add regression test for multiple `useQuery` calls

1. In `ConvexTestProvider.test.tsx`, define a test component that:
   - Calls `useQuery` for two different Convex queries (e.g. `api.items.list` and another simple query you introduce for testing).
   - Renders both results in a way that can be asserted independently.
2. Seed the backend so that the two queries return distinguishable values (for example, a list length vs. a specific string).
3. Add a new `it("supports multiple useQuery calls without cache collisions", ...)` test that:
   - Renders the component under `ConvexTestProvider`.
   - Waits for both query results.
   - Asserts that each `useQuery` receives the expected value from its own query.
4. Run `npm test` (or `npm run test`) and confirm this new test fails against the current implementation, demonstrating the bug.

### Step 2: Replace string-based cache key with identity-based structure

1. In `ConvexTestProvider.tsx`, replace the existing `const cache = new Map<string, unknown>();` with:
   - `const cache = new Map<unknown, Map<string, unknown>>();` so that:
     - The outer `Map` is keyed by the query function reference.
     - The inner `Map` is keyed by a stringified representation of `args`.
2. Update `watchQuery`:
   - Look up (or lazily create) an inner `Map` for the current `query`:
     - `let queryCache = cache.get(query);`  
       `if (!queryCache) { queryCache = new Map(); cache.set(query, queryCache); }`
   - Compute `const argsKey = JSON.stringify(args ?? {});`.
   - On `client.query(...).then(...)`, store the result in `queryCache.set(argsKey, result)` and then notify the subscriber.
   - Implement `localQueryResult` to read from `queryCache.get(argsKey)`.
3. Keep the `subscriber` logic and `mutation` forwarding behaviour unchanged.

### Step 3: Run and verify tests

1. Run the full test suite (e.g. `npm test`).
2. Confirm:
   - All existing tests still pass.
   - The new regression test for multiple `useQuery` calls now passes.
3. Optionally, run the tests multiple times to ensure there are no flakiness issues introduced by the new cache logic.

## Verification Checklist

- [ ] Regression test fails before the implementation change and passes after.
- [ ] No TypeScript errors or linter issues are introduced in the modified files.
- [ ] `ConvexTestProvider` continues to work for existing single-`useQuery` components and for mutations.

