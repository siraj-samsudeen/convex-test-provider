# convex-test-provider

React provider that adapts [convex-test](https://www.npmjs.com/package/convex-test)'s one-shot query/mutation client for use with Convex's `ConvexProvider`, so `useQuery` and `useMutation` work in tests against an in-memory backend.

## Install

```bash
npm i convex convex-test react
npm i -D convex-test-provider
```

## Usage

1. Create a convex-test client: `convexTest(schema, modules)`.
2. Wrap your component with `ConvexTestProvider` and pass the client:

```tsx
import { convexTest } from "convex-test";
import { ConvexTestProvider } from "convex-test-provider";
import schema from "./convex/schema";
import { modules } from "./convex/test.setup";

const testClient = convexTest(schema, modules);

render(
  <ConvexTestProvider client={testClient}>
    <YourComponent />
  </ConvexTestProvider>
);
```

## Query reactivity

This adapter runs each query **once** (when the component mounts). The UI does not re-render after a mutation in the same test. Assert backend state via `client.query(api.your.list, {})`, or re-mount to run the query again.

## Helper Functions

Reduce test boilerplate from ~15 lines to ~2 lines with `createConvexTest`.

### Setup

Create a test setup file in your Convex directory:

```typescript
// convex/test.setup.ts
import { createConvexTest, renderWithConvex } from "convex-test-provider";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex };
```

### Usage

```typescript
// src/components/TodoList.test.tsx
import { test, renderWithConvex } from "../../convex/test.setup";
import { expect } from "vitest";
import { api } from "../../convex/_generated/api";

test("creates a todo", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });

  const todos = await client.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
});
```

### Fixtures

| Fixture | Description |
|---------|-------------|
| `testClient` | Raw convex-test client (unauthenticated) |
| `userId` | Current user's ID (user auto-created) |
| `client` | Authenticated client for the current user |
| `seed(table, data)` | Insert data, auto-fills `userId` field |
| `createUser()` | Create another authenticated user |

### Multi-user Test Example

```typescript
test("users only see their own todos", async ({ client, createUser }) => {
  // Alice creates a todo
  await client.mutation(api.todos.create, { text: "Alice's todo" });

  // Bob can't see Alice's todo
  const bob = await createUser();
  const bobTodos = await bob.query(api.todos.list, {});
  expect(bobTodos).toHaveLength(0);
});
```

### Configuration

```typescript
// Custom users table name
export const test = createConvexTest(schema, modules, {
  usersTable: "profiles",
});
```

### Additional Helpers

- `wrapWithConvex(children, client)` — JSX wrapper for custom rendering
- `renderWithConvex(ui, client)` — Testing Library render with Convex provider

## Auth Testing

Test components that use `<Authenticated>`, `<Unauthenticated>`, `useConvexAuth()`, and `useAuthActions()` — without mocking.

```bash
npm i -D @convex-dev/auth
```

```tsx
import { renderWithConvexAuth } from "convex-test-provider";

// Authenticated (default) — <Authenticated> children render
renderWithConvexAuth(<App />, client);

// Unauthenticated — <Unauthenticated> children render
renderWithConvexAuth(<App />, client, { authenticated: false });
```

`renderWithConvexAuth` wraps your component with both auth state (so `<Authenticated>`, `<Unauthenticated>`, and `useConvexAuth()` work) and auth actions context (so `useAuthActions()` works). Calling `signIn()` sets auth to true; calling `signOut()` sets auth to false — the view re-renders accordingly.

```tsx
// Test sign-out toggles the view
renderWithConvexAuth(<App />, client);
await user.click(screen.getByRole("button", { name: /sign out/i }));
expect(screen.getByText("Please sign in")).toBeInTheDocument();
```

To simulate sign-in errors (e.g. test `.catch()` branches):

```tsx
renderWithConvexAuth(<App />, client, {
  authenticated: false,
  signInError: new Error("Invalid credentials"),
});
```

For custom wrapping, use `ConvexTestAuthProvider` directly:

```tsx
import { ConvexTestAuthProvider } from "convex-test-provider";

<ConvexTestAuthProvider client={client} authenticated={true}>
  <YourComponent />
</ConvexTestAuthProvider>
```

## Limitations

### One-shot query execution (non-reactive)

Queries resolve **once** at component mount. After a mutation, the UI does not automatically re-render with updated data — this adapter does not simulate Convex's reactive subscription model.

To verify backend state after a mutation, query directly:

```tsx
await user.click(screen.getByRole("button", { name: "Add" }));
const items = await client.query(api.items.list, {});
expect(items).toHaveLength(1);
```

To see updated data in the UI, unmount and remount the component (or call `rerender`).

### Nested `runQuery`/`runMutation` lose auth context

When a Convex function calls `ctx.runQuery()` or `ctx.runMutation()`, the nested call does not inherit the caller's auth identity. This is an [upstream limitation in convex-test](https://github.com/get-convex/convex-test), not in this package.

**Workaround:** Avoid nested `runQuery`/`runMutation` in functions under test, or pass the user ID as an explicit argument instead of relying on `ctx.auth.getUserIdentity()` inside nested calls.

## Types

The `client` prop accepts any object with `query(ref, args)` and `mutation(ref, args)` returning promises. The result of `convexTest(schema, modules)` (and `.withIdentity(...)`) satisfies this.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

AI agents: See [CLAUDE.md](CLAUDE.md) for quick reference.

## Versioning

Releases follow [semantic versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for release history.
