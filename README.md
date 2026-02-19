# feather-testing-convex

React provider that adapts [convex-test](https://www.npmjs.com/package/convex-test)'s one-shot query/mutation client for use with Convex's `ConvexProvider`, so `useQuery` and `useMutation` work in tests against an in-memory backend.

## Install

```bash
npm i convex convex-test react
npm i -D feather-testing-convex
```

## Quick Start

Three files to get from zero to a working test:

**1. `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["convex/**", "edge-runtime"]],
    server: { deps: { inline: ["convex-test"] } },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

**2. `convex/test.setup.ts`**

```typescript
/// <reference types="vite/client" />
import { createConvexTest, renderWithConvex } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex };
```

**3. `src/test-setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

**First test:**

```tsx
import { describe, expect } from "vitest";
import { screen } from "@testing-library/react";
import { test, renderWithConvex } from "../../convex/test.setup";
import { TodoList } from "./TodoList";

describe("TodoList", () => {
  test("shows seeded data", async ({ client, seed }) => {
    await seed("todos", { text: "Buy milk", completed: false });
    renderWithConvex(<TodoList />, client);
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
  });
});
```

For auth testing, see [Auth Testing](#auth-testing) below.

## Usage

> For the recommended setup, see [Quick Start](#quick-start) above. This section shows the low-level API.

1. Create a convex-test client: `convexTest(schema, modules)`.
2. Wrap your component with `ConvexTestProvider` and pass the client:

```tsx
import { convexTest } from "convex-test";
import { ConvexTestProvider } from "feather-testing-convex";
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
import { createConvexTest, renderWithConvex } from "feather-testing-convex";
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
| `userId` | ID of an auto-created user (string) |
| `client` | Authenticated client for the auto-created user |
| `seed(table, data)` | Insert a document. Auto-fills `userId` unless `data` includes an explicit `userId` (explicit wins). Returns the document ID. |
| `createUser()` | Create another user, return authenticated client with `.userId` property. |

### Multi-user Test Example

```typescript
test("users only see their own todos", async ({ client, seed, createUser }) => {
  // Alice creates a todo
  await client.mutation(api.todos.create, { text: "Alice's todo" });

  // Bob creates a todo (seed with explicit userId)
  const bob = await createUser();
  await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });

  // Each user only sees their own
  const aliceTodos = await client.query(api.todos.list, {});
  expect(aliceTodos).toHaveLength(1);

  const bobTodos = await bob.query(api.todos.list, {});
  expect(bobTodos).toHaveLength(1);
  expect(bobTodos[0].text).toBe("Bob's todo");
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

### Prerequisites

```bash
npm i -D @convex-dev/auth
```

Add the vitest plugin to resolve an internal `@convex-dev/auth` import ([upstream fix requested](https://github.com/get-convex/convex-auth/issues/281)):

```typescript
// vitest.config.ts
import { convexTestProviderPlugin } from "feather-testing-convex/vitest-plugin";

export default defineConfig({
  plugins: [
    react(),
    convexTestProviderPlugin(),  // resolves @convex-dev/auth internal import
  ],
  // ... rest of config unchanged
});
```

### Usage

```tsx
import { renderWithConvexAuth } from "feather-testing-convex";

// Authenticated (default) — <Authenticated> children render
renderWithConvexAuth(<App />, client);

// Unauthenticated — <Unauthenticated> children render
renderWithConvexAuth(<App />, client, { authenticated: false });
```

`renderWithConvexAuth` wraps your component with both auth state (so `<Authenticated>`, `<Unauthenticated>`, and `useConvexAuth()` work) and auth actions context (so `useAuthActions()` works). Calling `signIn()` sets auth to true; calling `signOut()` sets auth to false — the view re-renders accordingly.

### Complete auth test example

```tsx
import { test, renderWithConvexAuth } from "../../convex/test.setup";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";

test("sign out toggles the view", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<App />, client);

  await user.click(screen.getByRole("button", { name: /sign out/i }));
  expect(await screen.findByText("Please sign in")).toBeInTheDocument();
});
```

### Sign-in error simulation

```tsx
renderWithConvexAuth(<App />, client, {
  authenticated: false,
  signInError: new Error("Invalid credentials"),
});
```

### Direct `ConvexTestAuthProvider` (custom wrapping)

```tsx
import { ConvexTestAuthProvider } from "feather-testing-convex";

<ConvexTestAuthProvider client={client} authenticated={true}>
  <YourComponent />
</ConvexTestAuthProvider>
```

## Vitest Configuration Reference

### Minimal config (no auth)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["convex/**", "edge-runtime"]],
    server: { deps: { inline: ["convex-test"] } },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

### With auth testing

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { convexTestProviderPlugin } from "feather-testing-convex/vitest-plugin";

export default defineConfig({
  plugins: [react(), convexTestProviderPlugin()],
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["convex/**", "edge-runtime"]],
    server: { deps: { inline: ["convex-test"] } },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

### Config options explained

| Option | Why |
|--------|-----|
| `react()` | JSX transform for test files |
| `environment: "jsdom"` | DOM APIs for React component tests |
| `environmentMatchGlobs` | Convex functions run in edge runtime, not jsdom |
| `server.deps.inline: ["convex-test"]` | convex-test must be inlined for Vitest to resolve it |
| `setupFiles` | Load jest-dom matchers (`toBeInTheDocument()`, etc.) |
| `convexTestProviderPlugin()` | Resolves `@convex-dev/auth` internal import (auth testing only) |

## Agent Skills

Install skills for AI coding agents via [skills.sh](https://skills.sh):

```bash
npx skills add siraj-samsudeen/feather-testing-convex
```

This installs three skills: `setup-convex-testing`, `add-convex-auth-testing`, and `convex-test-patterns`.

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

When a Convex function calls `ctx.runQuery()` or `ctx.runMutation()`, the nested call does not inherit the caller's auth identity. This is an [upstream limitation in convex-test](https://github.com/get-convex/convex-test) ([issue #50](https://github.com/get-convex/convex-test/issues/50)), not in this package.

**Root cause:** In `convex-test`, the `queryFromPath` and `mutationFromPath` handlers spread `{ ...ctx, auth }` but do not override `ctx.runQuery`/`ctx.runMutation` with auth-aware versions. Actions (`actionFromPath`) already do this correctly.

**Workarounds:**

1. **Pass userId as an explicit argument** (recommended) — create `internalQuery`/`internalMutation` variants that accept `userId` instead of reading `ctx.auth.getUserIdentity()` inside nested calls.
2. **Use `patch-package`** — apply a 2-line fix to `node_modules/convex-test/dist/index.js`:
   - In `queryFromPath`: change `{ ...ctx, auth }` to `{ ...ctx, auth, runQuery: byType.query }`
   - In `runTransaction`: change `{ ...ctx, auth, ...extraCtx }` to `{ ...ctx, auth, runQuery: byType.query, runMutation: byType.mutation, ...extraCtx }`
3. **Use actions for orchestration** — actions already propagate auth correctly to nested calls (note: different transactional semantics).

## Types

The `client` prop accepts any object with `query(ref, args)` and `mutation(ref, args)` returning promises. The result of `convexTest(schema, modules)` (and `.withIdentity(...)`) satisfies this.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

AI agents: See [CLAUDE.md](CLAUDE.md) for quick reference.

## Versioning

Releases follow [semantic versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for release history.
