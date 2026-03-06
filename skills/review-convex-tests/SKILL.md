---
name: review-convex-tests
description: "Checklist: Are your Convex tests correct? 10-point review for integration-vs-mock mistakes, missing seed(), unused Session DSL, stale UI assertions after mutations."
license: MIT
metadata:
  author: siraj-samsudeen
  version: "0.1"
---

# Review Convex Tests

10-point quality checklist for Convex test files. Run this after writing or generating tests.

**Dual-purpose:** Use this to review tests you just wrote OR to audit existing test files for anti-patterns.

**Prerequisite:** Test infrastructure must already be set up (see `setup-convex-testing`).

---

## Checklist

### ☐ 1. No mocked backend for data-display tests

**Rule:** If the component displays data from `useQuery`, test it with integration tests (`renderWithConvex` + `seed`), not mocks.

**Smell:**
```tsx
// ❌ Mocking useQuery for a data-display test
vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mocked(useQuery).mockReturnValue([{ text: "Buy milk" }]);
render(<TodoList />);
expect(screen.getByText("Buy milk")).toBeInTheDocument();
```

**Fix:**
```tsx
// ✅ Integration test with real backend
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

### ☐ 2. No backend-only tests for simple CRUD

**Rule:** Don't write backend-only tests for simple queries/mutations that are already covered by integration tests. Backend-only tests are only justified for complex business logic.

**Smell:**
```typescript
// ❌ Backend-only test duplicating what an integration test already covers
test("todos.list returns data", async () => {
  const t = convexTest(schema, modules);
  // ... 15 lines of setup
  const todos = await t.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
});
```

**Fix:** Delete the backend-only test if an integration test already covers the same query. Run coverage to verify nothing is lost.

### ☐ 3. Mocks ONLY for transient states

**Rule:** Use `vi.mock` only for loading spinners and error states — transient states that can't be reliably produced with a real backend.

**Smell:**
```tsx
// ❌ Mocking to test empty state (integration test can do this)
vi.mocked(useQuery).mockReturnValue([]);
render(<TodoList />);
expect(screen.getByText("No todos yet")).toBeInTheDocument();
```

**Fix:**
```tsx
// ✅ Integration test — empty state is just "no data seeded"
test("shows empty state", async ({ client }) => {
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("No todos yet")).toBeInTheDocument();
});

// ✅ Mock is OK for loading state (transient, can't reliably produce)
vi.mocked(useQuery).mockReturnValue(undefined);
render(<TodoList />);
expect(screen.getByText("Loading...")).toBeInTheDocument();
```

### ☐ 4. Using seed() instead of raw DB inserts

**Rule:** Prefer `seed()` for data setup. It auto-fills `userId` and is more concise than `testClient.run()`.

**Smell:**
```typescript
// ❌ Verbose raw DB insert
await testClient.run(async (ctx: any) => {
  await ctx.db.insert("todos", {
    text: "Buy milk",
    completed: false,
    userId,
  });
});
```

**Fix:**
```typescript
// ✅ seed() auto-fills userId
await seed("todos", { text: "Buy milk", completed: false });
```

Use raw DB inserts only when you need edge-case state that no mutation or seed can produce.

See [references/data-seeding.md](references/data-seeding.md) for full patterns.

### ☐ 5. Using Session DSL for form interactions

**Rule:** For tests with multiple user interactions (form fills, button clicks, assertions), use the Session DSL instead of verbose `userEvent` + `screen` calls.

**Smell:**
```tsx
// ❌ Verbose manual interactions
const user = userEvent.setup();
await user.type(screen.getByLabelText("Email"), "test@example.com");
await user.type(screen.getByLabelText("Password"), "secret123");
await user.click(screen.getByRole("button", { name: "Sign Up" }));
expect(await screen.findByText("Welcome")).toBeInTheDocument();
```

**Fix:**
```tsx
// ✅ Fluent Session DSL
const session = renderWithSession(<SignupForm />, client, { authenticated: false });
await session
  .fillIn("Email", "test@example.com")
  .fillIn("Password", "secret123")
  .clickButton("Sign Up")
  .assertText("Welcome");
```

See [references/session-dsl.md](references/session-dsl.md) for the full API.

### ☐ 6. Session DSL chains are awaited

**Rule:** Session methods queue up but don't execute until `await`. Every chain must be awaited.

**Smell:**
```tsx
// ❌ Missing await — chain never executes
session
  .fillIn("Email", "test@example.com")
  .clickButton("Submit");
```

**Fix:**
```tsx
// ✅ Await the chain
await session
  .fillIn("Email", "test@example.com")
  .clickButton("Submit");
```

See [references/session-dsl.md](references/session-dsl.md) for chaining patterns.

### ☐ 7. Not asserting stale UI after mutations

**Rule:** Queries are one-shot (run once at mount). After a mutation, the UI does NOT re-render. Assert backend state directly or re-mount.

**Smell:**
```tsx
// ❌ Expecting UI to update after mutation (it won't)
renderWithConvex(<TodoList />, client);
await user.click(screen.getByRole("button", { name: "Add" }));
expect(await screen.findByText("New todo")).toBeInTheDocument(); // FAILS
```

**Fix:**
```tsx
// ✅ Assert backend state directly
renderWithConvex(<TodoForm />, client);
await user.click(screen.getByRole("button", { name: "Add" }));
const todos = await client.query(api.todos.list, {});
expect(todos).toHaveLength(1);

// ✅ Or re-mount to see updated UI
const { unmount } = renderWithConvex(<TodoList />, client);
await client.mutation(api.todos.create, { text: "New todo" });
unmount();
renderWithConvex(<TodoList />, client);
expect(await screen.findByText("New todo")).toBeInTheDocument();
```

See [references/one-shot-workarounds.md](references/one-shot-workarounds.md) for all workarounds.

### ☐ 8. Using findByText for async data, not getByText

**Rule:** Data from `useQuery` resolves asynchronously. Use `await screen.findByText()` (waits for element) instead of `screen.getByText()` (fails immediately if not found).

**Smell:**
```tsx
// ❌ getByText fails because query hasn't resolved yet
renderWithConvex(<TodoList />, client);
expect(screen.getByText("Buy milk")).toBeInTheDocument();
```

**Fix:**
```tsx
// ✅ findByText waits for the element to appear
renderWithConvex(<TodoList />, client);
expect(await screen.findByText("Buy milk")).toBeInTheDocument();
```

### ☐ 9. Multi-user tests use explicit userId with seed

**Rule:** When seeding data for a non-default user, pass `userId` explicitly. Without it, `seed()` auto-fills the default test user's ID.

**Smell:**
```typescript
// ❌ Missing explicit userId — data goes to default user, not Bob
const bob = await createUser();
await seed("todos", { text: "Bob's todo", completed: false });
// Bob can't see this todo!
```

**Fix:**
```typescript
// ✅ Explicit userId overrides the default
const bob = await createUser();
await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });
```

### ☐ 10. MECE test design — no overlap, no gaps

**Rule:** Tests should be Mutually Exclusive, Collectively Exhaustive. Each component state gets exactly one test. No two tests cover the same state.

**Smell:**
```tsx
// ❌ Two tests that overlap — both test "data loaded" state
test("shows todos", ...);           // integration test with seed
test("renders todo items", ...);     // mock test with same data
```

**Fix:** Map out all component states and assign each one test:

```tsx
// Component has 3 states:
// todos === undefined → Loading (mock)
// todos.length === 0  → Empty (integration)
// todos.length > 0    → With data (integration)

test("loading state", ...);      // mock: useQuery returns undefined
test("empty state", ...);        // integration: no data seeded
test("shows seeded data", ...);  // integration: seed + renderWithConvex
// 3 tests = 100% coverage, no redundancy
```

---

## Reference Files

| File | When to consult |
|------|-----------------|
| [references/data-seeding.md](references/data-seeding.md) | Checklist items #4, #9 — seed patterns, multi-user, explicit userId |
| [references/session-dsl.md](references/session-dsl.md) | Checklist items #5, #6 — full Session DSL API, within(), chaining |
| [references/one-shot-workarounds.md](references/one-shot-workarounds.md) | Checklist item #7 — why queries don't re-run, how to assert after mutations |
