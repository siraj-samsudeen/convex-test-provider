---
name: setup-convex-testing
description: "Checklist: Is Convex test infrastructure set up? Verify or create vitest.config.ts, test.setup.ts, convex/test.setup.ts, deps. Run this first — the other two skills depend on it."
license: MIT
metadata:
  author: siraj-samsudeen
  version: "0.5"
---

# Set Up Convex Testing

Verify or create the test infrastructure for React + Convex integration testing.

**Dual-purpose:** Use this checklist to set up testing from scratch OR to diagnose why existing tests won't run.

## ⚠️ Philosophy: Integration Tests First

**Do NOT write separate backend unit tests and mocked component tests.** This library enables true integration tests that test both layers together.

### ❌ Anti-Pattern: Isolated Unit Tests
```tsx
// DON'T: Backend-only test
test("todos.list returns data", async () => {
  const t = convexTest(schema, modules);
  // ... 15 lines of setup
  const todos = await t.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
});

// DON'T: Component test with mocked backend
vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
test("TodoList renders", () => {
  vi.mocked(useQuery).mockReturnValue([{ text: "Buy milk" }]);
  render(<TodoList />);
  expect(screen.getByText("Buy milk")).toBeInTheDocument();
});
```

### ✅ Correct Pattern: Integration Tests
```tsx
// DO: One test covers both backend + component
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

**Use mocks ONLY for:** loading spinners, error states — transient states that can't be produced with a real backend.

---

## Checklist

### ☐ 1. Dependencies installed

**Check:**
```bash
npm ls convex-test feather-testing-convex @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

**If missing:**
```bash
npm install -D convex-test feather-testing-convex @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

### ☐ 2. vitest.config.ts exists with correct settings

**Check for these required settings:**
- `plugins: [react()]`
- `environment: "jsdom"`
- `environmentMatchGlobs: [["convex/**", "edge-runtime"]]`
- `server: { deps: { inline: ["convex-test"] } }`
- `setupFiles: ["./src/test-setup.ts"]`

**If missing or wrong, create/fix with:**
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

**Common errors:**
- Missing `inline: ["convex-test"]` → `Cannot find module 'convex-test'`
- Missing `environmentMatchGlobs` → Convex functions fail because they run in jsdom instead of edge-runtime

### ☐ 3. src/test-setup.ts exists

**Check:** File imports jest-dom matchers.

**If missing, create:**
```typescript
import "@testing-library/jest-dom/vitest";
```

### ☐ 4. convex/test.setup.ts exists with correct exports

**Check for:**
- `modules` glob export
- `createConvexTest(schema, modules)` → `test` export
- `renderWithConvex` re-export

**If missing, create:**
```typescript
/// <reference types="vite/client" />
import { createConvexTest, renderWithConvex } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex };
```

### ☐ 5. At least one test passes

**Run:**
```bash
npx vitest run
```

**If no tests exist, create one to verify the setup.**

Pick one example below. You don't need both.

#### Backend-only test (query + seed)

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

#### Integration test (React component + real backend)

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

### ☐ 6. Coverage configured (optional)

**Check:** `vitest.config.ts` has a coverage section and `@vitest/coverage-v8` is installed.

**If missing, install:**
```bash
npm install -D @vitest/coverage-v8
```

**Add coverage config to vitest.config.ts:**
```typescript
export default defineConfig({
  // ... existing config
  test: {
    // ... existing test config
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.test.{ts,tsx}",
        "**/*.config.{ts,js}",
        "convex/_generated/",
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
```

**Add npm scripts to package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Add to .gitignore:**
```
coverage/
```

**Run:**
```bash
npm run test:coverage
```

**Recommendations:**
- Target 100% coverage on production files — achievable with integration tests
- Exclude generated code (`convex/_generated/`), config files, and test helpers
- Integration tests often give backend coverage for free — check before writing separate backend tests

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
- See `review-convex-tests` skill references for workarounds

---

## Next Steps

- **Auth testing** (`<Authenticated>`, `useAuthActions()`, signIn/signOut) → use `add-convex-auth-testing`
- **Review test quality** (patterns, anti-patterns, best practices) → use `review-convex-tests`
