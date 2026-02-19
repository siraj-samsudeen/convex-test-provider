# Helper Functions Implementation Plan

> GitHub Issue: [#1](https://github.com/siraj-samsudeen/feather-testing-convex/issues/1)
> Package repo: `/Users/siraj/Desktop/NonDropBoxProjects/feather-testing-convex`

## Goal

Add helper functions to reduce test boilerplate from ~15 lines to ~2 lines per test.

## API Summary

```typescript
// Project setup (one time in convex/test.setup.ts)
import { createConvexTest, renderWithConvex } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex };
```

```typescript
// In tests
import { test, renderWithConvex } from "../../convex/test.setup";

test("Create task", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
});
```

## Fixtures Provided

| Fixture | Description |
|---------|-------------|
| `testClient` | Raw convex-test client (unauthenticated) |
| `userId` | Current user's ID |
| `client` | Authenticated client (user auto-created) |
| `seed(table, data)` | Insert data, auto-fills `userId` |
| `createUser()` | Create another authenticated user |

---

## Implementation Steps

### Step 1: Create `src/helpers.ts`

Create the main helper file with:
- `createConvexTest(schema, modules, options?)` — returns Vitest test with fixtures
- `wrapWithConvex(children, client)` — JSX wrapper (no dependencies)
- `renderWithConvex(ui, client)` — Testing Library render (optional dep)

Key implementation details:
- Use Vitest's `test.extend()` for fixtures
- Default `usersTable` to `"users"`, allow override
- Lazy evaluation — fixtures only run when accessed
- `seed()` auto-fills `userId` from current user

```typescript
// src/helpers.ts
import { test as baseTest } from "vitest";
import { convexTest } from "convex-test";
import { ConvexTestProvider } from "./ConvexTestProvider.js";
import type { ReactNode, ReactElement } from "react";

interface CreateConvexTestOptions {
  usersTable?: string;
}

export function createConvexTest(
  schema: unknown,
  modules: Record<string, unknown>,
  options: CreateConvexTestOptions = {}
) {
  const usersTable = options.usersTable ?? "users";

  return baseTest.extend({
    testClient: async ({}, use) => {
      const client = convexTest(schema, modules);
      await use(client);
    },

    userId: async ({ testClient }, use) => {
      const id = await testClient.run(async (ctx: any) => {
        return await ctx.db.insert(usersTable, {});
      });
      await use(id);
    },

    client: async ({ testClient, userId }, use) => {
      const authenticated = testClient.withIdentity({ subject: userId });
      await use(authenticated);
    },

    seed: async ({ testClient, userId }, use) => {
      const seedFn = async (table: string, data: Record<string, unknown>) => {
        return await testClient.run(async (ctx: any) => {
          return await ctx.db.insert(table, { ...data, userId });
        });
      };
      await use(seedFn);
    },

    createUser: async ({ testClient }, use) => {
      const createUserFn = async () => {
        const newUserId = await testClient.run(async (ctx: any) => {
          return await ctx.db.insert(usersTable, {});
        });
        return testClient.withIdentity({ subject: newUserId });
      };
      await use(createUserFn);
    },
  });
}

export function wrapWithConvex(children: ReactNode, client: unknown) {
  return <ConvexTestProvider client={client as any}>{children}</ConvexTestProvider>;
}

export function renderWithConvex(ui: ReactElement, client: unknown) {
  let render: any;
  try {
    render = require("@testing-library/react").render;
  } catch {
    throw new Error(
      "renderWithConvex requires @testing-library/react. " +
      "Install it or use wrapWithConvex() instead."
    );
  }
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => wrapWithConvex(children, client),
  });
}
```

### Step 2: Update `src/index.ts`

```typescript
export { ConvexTestProvider, type ConvexTestClient } from "./ConvexTestProvider.js";
export { createConvexTest, wrapWithConvex, renderWithConvex } from "./helpers.js";
```

### Step 3: Update `package.json`

Add peer dependencies:
```json
{
  "peerDependencies": {
    "convex": ">=1.0.0",
    "convex-test": ">=0.0.1",
    "react": ">=18.0.0",
    "vitest": ">=1.0.0",
    "@testing-library/react": ">=14.0.0"
  },
  "peerDependenciesMeta": {
    "@testing-library/react": {
      "optional": true
    }
  }
}
```

### Step 4: Create `src/helpers.test.ts`

Dogfood the new API:

```typescript
import { describe, expect } from "vitest";
import { createConvexTest, renderWithConvex } from "./index.js";
import schema from "../convex/schema.js";
import { modules } from "../convex/test.setup.js";
import { api } from "../convex/_generated/api.js";

const test = createConvexTest(schema, modules);

describe("createConvexTest fixtures", () => {
  test("client fixture is authenticated", async ({ client, userId }) => {
    expect(userId).toBeDefined();
    expect(typeof userId).toBe("string");
  });

  test("seed auto-fills userId", async ({ client, seed }) => {
    const todoId = await seed("todos", { text: "Test", completed: false });
    expect(todoId).toBeDefined();

    const todos = await client.query(api.todos.list, {});
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe("Test");
  });

  test("createUser returns new authenticated client", async ({ client, createUser }) => {
    const bob = await createUser();

    await client.mutation(api.todos.create, { text: "Alice's" });
    const bobTodos = await bob.query(api.todos.list, {});
    expect(bobTodos).toHaveLength(0);
  });

  test("testClient is unauthenticated", async ({ testClient }) => {
    const todos = await testClient.query(api.todos.list, {});
    expect(todos).toHaveLength(0);
  });
});
```

### Step 5: Update README.md

Add documentation section for helpers with:
- Quick start example
- All fixtures documented
- Configuration options
- Multi-user test example

---

## Files Summary

| File | Action |
|------|--------|
| `src/helpers.ts` | Create |
| `src/helpers.test.ts` | Create |
| `src/index.ts` | Modify (add exports) |
| `package.json` | Modify (peer deps) |
| `README.md` | Modify (docs) |

---

## Verification

1. `npm run build` — TypeScript compiles without errors
2. `npm test` — All tests pass
3. Test in consumer app (`/Users/siraj/Desktop/NonDropBoxProjects/calmdo_solveit`):
   - Create `convex/test.setup.ts` using new API
   - Refactor `src/components/TodoList.integration.test.tsx`
   - Verify all tests pass with reduced boilerplate

---

## Order of Execution

1. [ ] Create `src/helpers.ts`
2. [ ] Update `src/index.ts`
3. [ ] Update `package.json`
4. [ ] Create `src/helpers.test.ts`
5. [ ] Run `npm run build` — verify compilation
6. [ ] Run `npm test` — verify tests pass
7. [ ] Update `README.md`
8. [ ] Commit all changes
