---
name: setup-convex-testing
description: Set up integration testing for React + Convex + Vite projects. Enables testing React components with real Convex backend function execution.
license: MIT
metadata:
  author: siraj-samsudeen
  version: "0.3"
---

# Set Up Convex Testing

Sets up integration testing for React + Convex + Vite using [feather-testing-convex](https://www.npmjs.com/package/feather-testing-convex). Tests React components with real Convex backend execution — no mocking, no running a local backend.

## When to Use

- New React + Convex + Vite project that needs testing
- When you want integration tests (real backend functions + React together)

## Git Workflow

Working tree must be clean before starting. Commit all setup changes together when done.

---

## 1. Install Dependencies

```bash
npm install -D convex-test feather-testing-convex @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

## 2. Create `vitest.config.ts`

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

## 3. Create `src/test-setup.ts`

```typescript
import "@testing-library/jest-dom/vitest";
```

## 4. Create `convex/test.setup.ts`

```typescript
/// <reference types="vite/client" />
import { createConvexTest, renderWithConvex } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex };
```

## 5. First Test

Pick one example below to verify your setup. You don't need both.

### Backend-only test (query + seed)

```typescript
// src/components/TodoList.test.ts
import { describe, expect } from "vitest";
import { test } from "../../convex/test.setup";
import { api } from "../../convex/_generated/api";

describe("Todos", () => {
  test("seed and query", async ({ client, seed }) => {
    await seed("todos", { text: "Buy milk", completed: false });

    const todos = await client.query(api.todos.list, {});
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe("Buy milk");
  });
});
```

### Integration test (React component + real backend)

```tsx
// src/components/TodoList.test.tsx
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

## 6. Verify Setup

```bash
npx vitest run
```

One passing test confirms the setup is correct.

---

## Fixtures Reference

`createConvexTest(schema, modules, options?)` returns a custom `test` function with these fixtures:

| Fixture | Description |
|---------|-------------|
| `testClient` | Raw convex-test client (unauthenticated) |
| `userId` | ID of an auto-created user (string) |
| `client` | Authenticated client for the auto-created user |
| `seed(table, data)` | Insert a document. Auto-fills `userId` unless `data` includes an explicit `userId` (explicit wins). Returns the document ID. |
| `createUser()` | Create another user, return authenticated client with `.userId` property. |

### Options

```typescript
// Custom users table name (default: "users")
export const test = createConvexTest(schema, modules, { usersTable: "profiles" });
```

### Additional Helpers

- `wrapWithConvex(children, client)` — JSX wrapper for custom rendering
- `renderWithConvex(ui, client)` — Testing Library render with Convex provider

## Query Behavior

Queries run **once** at component mount (one-shot). UI does not re-render after a mutation.

- Assert backend state directly: `await client.query(api.items.list, {})`
- See updated UI: unmount and remount the component
- See `/convex-test-patterns` for more workarounds

---

## Common Mistakes to Avoid

- **Missing `server.deps.inline: ["convex-test"]`** in vitest config → `Cannot find module 'convex-test'`
- **Missing `environmentMatchGlobs`** → Convex functions fail because they run in jsdom instead of edge-runtime
- **Using `screen.getByText()` for async data** → Use `await screen.findByText()` instead; queries resolve asynchronously
- **Expecting queries to re-run after mutations** → One-shot model; assert via `client.query()` or re-mount

---

## Next Steps

- **Auth testing** (`<Authenticated>`, `useAuthActions()`, signIn/signOut) → use `/add-convex-auth-testing`
- **Testing patterns** (multi-user, data seeding, MECE, coverage) → use `/convex-test-patterns`
