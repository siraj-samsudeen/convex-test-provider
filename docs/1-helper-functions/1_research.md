# Helper Functions Research

> GitHub Issue: [#1](https://github.com/siraj-samsudeen/feather-testing-convex/issues/1)

## Context

Phase 2 of feather-testing-convex: ship helper functions to reduce test boilerplate. The goal is to bring the best ideas from Phoenix LiveView, RSpec, and modern JS testing to Convex.

### The Problem

Current test setup requires ~15 lines of boilerplate per test:

```typescript
const testClient = convexTest(schema, modules);
const userId = await testClient.run(async (ctx) => {
  return await ctx.db.insert("users", {});
});
const testClientAsUser = testClient.withIdentity({ subject: userId });
await testClient.run(async (ctx) => {
  await ctx.db.insert("todos", { text: "Buy milk", completed: false, userId });
});
render(
  <ConvexTestProvider client={testClientAsUser}>
    <TodoList />
  </ConvexTestProvider>
);
```

---

## Ecosystems Consulted

### Phoenix LiveView / ExUnit
- [Phoenix Testing](https://hexdocs.pm/phoenix/testing.html)
- [Phoenix.ConnTest](https://hexdocs.pm/phoenix/Phoenix.ConnTest.html)
- [Testing Contexts](https://hexdocs.pm/phoenix/testing_contexts.html)

**Key patterns:**
- `ConnCase` module: define project conventions once, use everywhere
- Setup block returns a **context object** that tests destructure
- Auth is a **composable function** (`log_in_user(conn, user)`)
- No schema assumptions — consumer defines how to create users

### RSpec (Ruby)
- [Better Specs](https://www.betterspecs.org/)
- [RSpec Style Guide](https://rspec.rubystyle.guide/)

**Key patterns:**
- `let` for lazy-loaded fixtures (computed only when accessed)
- `subject` for the thing under test
- `context` blocks with "when/with/without" naming
- One expectation per test reads like a sentence

### Vitest
- [Test Context](https://vitest.dev/guide/test-context.html)

**Key patterns:**
- `test.extend()` for type-safe, composable fixtures
- Fixtures are self-contained (setup + teardown in one place)
- Fixtures can depend on other fixtures
- Lazy evaluation — unused fixtures don't run

### Playwright
- [Fixtures](https://playwright.dev/docs/test-fixtures)

**Key patterns:**
- Fixtures encapsulate setup/teardown in same place
- Reusable between test files
- Automatic fixtures run regardless of usage

### Testing Library (React)
- [API Reference](https://testing-library.com/docs/react-testing-library/api/)

**Key patterns:**
- Custom render with wrapper for providers
- Single `render` call hides all provider wrapping

### JUnit / AssertJ (Java)
- [AssertJ](https://assertj.github.io/doc/)

**Key patterns:**
- Fluent assertions (chainable, read left-to-right)

---

## Options Considered

### API Style

| Option | Description | Pros | Cons | Decision |
|--------|-------------|------|------|----------|
| Phoenix-style factory | `createTestContext()` returns object | Simple, no framework integration | Manual context passing, no lazy eval | Rejected |
| Vitest `test.extend()` | Creates custom test function with fixtures | Type-safe, composable, lazy evaluation, native Vitest | Slightly more complex | **Chosen** |

**Why Vitest fixtures:** Type inference works automatically, fixtures only run when accessed (like RSpec's `let`), and it integrates natively with `test.describe`, `test.skip`, etc.

### Export Path

| Option | Import | Decision |
|--------|--------|----------|
| `/testing` | `from "feather-testing-convex/testing"` | Rejected — adds complexity |
| `/helpers` | `from "feather-testing-convex/helpers"` | Rejected — adds complexity |
| Main export | `from "feather-testing-convex"` | **Chosen** — simpler mental model |

**Why main export:** One package, one import. The component and helpers are part of the same testing story.

### Default Behavior

| Question | Options | Decision | Rationale |
|----------|---------|----------|-----------|
| Auth on by default? | Yes / No | **Yes** | 80% of tests need authenticated user |
| Assume "users" table? | Yes / No / Configurable | **Yes, with override** | Most Convex Auth projects use `users` table; override via `usersTable` option |
| Require anonymous functions for common cases? | Yes / No | **No** | Package provides `seed()`, `createUser()` — no `ctx.db.insert` calls needed |

---

## Key Q&A

**Q: Why not make users write `authenticate: (ctx) => ctx.db.insert("users", {})` every time?**

A: Convention over configuration. The package should handle 80% of cases with zero config. Users only override for custom scenarios (different table, extra fields).

**Q: How do multi-user tests work?**

A: `createUser()` fixture function creates additional authenticated users on demand:
```typescript
test("isolation", async ({ client, createUser }) => {
  const bob = await createUser();
  // client = first user, bob = second user
});
```

**Q: How does seed data work?**

A: `seed(table, data)` auto-fills `userId` from current authenticated user:
```typescript
test("with data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  // userId is automatically set to client's user
});
```

**Q: What about projects without Testing Library?**

A: `@testing-library/react` is an optional peer dependency. Without it, use `wrapWithConvex()` which returns JSX. With it, use `renderWithConvex()` which calls `render()` internally.

---

## Final Design

### Fixtures Provided

| Fixture | Type | Description |
|---------|------|-------------|
| `testClient` | `TestConvex` | Raw convex-test client (for unauth edge cases) |
| `userId` | `string` | Current user's ID |
| `client` | `TestConvex` | Authenticated client (user auto-created) |
| `seed(table, data)` | `function` | Insert data, auto-fills `userId` |
| `createUser()` | `function` | Create another authenticated user, returns client |

### Project Setup (One Time)

```typescript
// convex/test.setup.ts
import { createConvexTest, renderWithConvex } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex };
```

### Test Usage

```typescript
import { test, renderWithConvex } from "../../convex/test.setup";

// Basic — client is authenticated
test("Create task", async ({ client }) => {
  renderWithConvex(<TodoList />, client);
});

// With seeded data
test("View existing", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
});

// Multi-user
test("User isolation", async ({ client, createUser }) => {
  const bob = await createUser();
  await client.mutation(api.todos.create, { text: "Mine" });
  expect(await bob.query(api.todos.list, {})).toHaveLength(0);
});

// Unauthenticated edge case
test("Unauth returns empty", async ({ testClient }) => {
  const todos = await testClient.query(api.todos.list, {});
  expect(todos).toHaveLength(0);
});
```

### Configuration (Optional)

```typescript
// Custom users table
export const test = createConvexTest(schema, modules, {
  usersTable: "accounts"
});
```

---

## Comparison: Before & After

**Before (15 lines):**
```typescript
it("Create task", async () => {
  const testClient = convexTest(schema, modules);
  const userId = await testClient.run(async (ctx) => {
    return await ctx.db.insert("users", {});
  });
  const testClientAsUser = testClient.withIdentity({ subject: userId });
  render(
    <ConvexTestProvider client={testClientAsUser}>
      <TodoList />
    </ConvexTestProvider>,
  );
  // actual test...
});
```

**After (2 lines of setup):**
```typescript
test("Create task", async ({ client }) => {
  renderWithConvex(<TodoList />, client);
  // actual test...
});
```
