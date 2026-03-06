# feather-testing-convex

Integration testing for React + Convex apps. Test your React components with **real Convex backend functions** — no mocking, no running a local backend.

Built on [convex-test](https://www.npmjs.com/package/convex-test)'s in-memory backend, this library bridges the gap between backend functions and React components so `useQuery`, `useMutation`, `<Authenticated>`, `<Unauthenticated>`, `useConvexAuth()`, and `useAuthActions()` all work in tests.

## Philosophy: Integration Tests, Not Isolated Unit Tests

### The Problem with the Popular Pattern

Most React + backend tutorials teach you to write tests at two separate layers:

```tsx
// ❌ Layer 1: Backend-only test (tests the query in isolation)
test("todos.list returns user's todos", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const authed = t.withIdentity({ subject: userId });
  await t.run(async (ctx) => {
    await ctx.db.insert("todos", { text: "Buy milk", completed: false, userId });
  });
  const todos = await authed.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
});

// ❌ Layer 2: Component test with mocked backend
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

test("TodoList renders items", () => {
  vi.mocked(useQuery).mockReturnValue([{ _id: "1", text: "Buy milk", completed: false }]);
  render(<TodoList />);
  expect(screen.getByText("Buy milk")).toBeInTheDocument();
});
```

**This gives you 2 tests that overlap in coverage but miss the integration between layers.** The backend test proves the query works. The component test proves rendering works. But neither test proves that the component correctly calls the query and renders the real data.

### What This Library Enables

**One integration test replaces both isolated tests:**

```tsx
// ✅ One test covers backend + component + data flow
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

This single test verifies:
- ✅ The Convex `todos.list` query function executes correctly
- ✅ The React component calls `useQuery` with the right arguments
- ✅ Data flows from the in-memory backend through `useQuery` to the UI
- ✅ The component renders the data correctly

### When to Still Use Mocks

Integration tests are the default. Use mocks **only** for transient states you can't produce with a real backend:

| State | Approach | Why |
|-------|----------|-----|
| Data loaded | **Integration** | Real query returns real data |
| Empty state | **Integration** | Real query returns `[]` |
| Loading spinner | **Mock** | Loading is transient — query resolves too fast to observe |
| Error state | **Mock** | Can't reliably produce errors from real backend |
| Everything else | **Integration** | Real backend + real React |

### The MECE Principle

Tests should be **Mutually Exclusive, Collectively Exhaustive** — no overlap, no gaps.

```tsx
function TodoList() {
  const todos = useQuery(api.todos.list);
  if (todos === undefined) return <div>Loading...</div>;      // State 1: Mock
  if (todos.length === 0) return <div>No todos yet</div>;     // State 2: Integration
  return <ul>{todos.map(t => <li key={t._id}>{t.text}</li>)}</ul>;  // State 3: Integration
}
```

**3 tests = 100% coverage. No overlap between integration and mock tests.**

---

## Quick Start

Three files to set up, then write your first test.

### 1. Install Dependencies

```bash
npm install -D convex-test feather-testing-convex @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

### 2. Create `vitest.config.ts`

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

### 3. Create `convex/test.setup.ts`

```typescript
/// <reference types="vite/client" />
import { createConvexTest, renderWithConvex } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex };
```

### 4. Create `src/test-setup.ts`

```typescript
import "@testing-library/jest-dom/vitest";
```

### 5. Write Your First Test

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

### 6. Run

```bash
npx vitest run
```

---

## Features with Before/After Examples

### 1. Authenticated Backend Queries

Test backend functions with an auto-created authenticated user.

**Before (raw convex-test — ~15 lines of boilerplate):**
```typescript
import { convexTest } from "convex-test";

it("returns user's todos", async () => {
  const testClient = convexTest(schema, modules);
  const userId = await testClient.run(async (ctx) => {
    return await ctx.db.insert("users", {});
  });
  const client = testClient.withIdentity({ subject: userId });
  await testClient.run(async (ctx) => {
    await ctx.db.insert("todos", { text: "Buy milk", completed: false, userId });
  });

  const todos = await client.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
  expect(todos[0].text).toBe("Buy milk");
});
```

**After (with createConvexTest fixtures — 3 lines):**
```typescript
test("returns user's todos", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });

  const todos = await client.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
  expect(todos[0].text).toBe("Buy milk");
});
```

The `test` function provides `client` (authenticated) and `seed` (auto-fills `userId`) as fixtures.

---

### 2. Integration Tests (React Component + Real Backend)

Render a React component that calls `useQuery` against a real in-memory backend.

**Before (manual provider wrapping):**
```tsx
import { convexTest } from "convex-test";
import { ConvexTestProvider } from "feather-testing-convex";

it("shows todos", async () => {
  const testClient = convexTest(schema, modules);
  const userId = await testClient.run(async (ctx) => ctx.db.insert("users", {}));
  const client = testClient.withIdentity({ subject: userId });
  await testClient.run(async (ctx) => {
    await ctx.db.insert("todos", { text: "Buy milk", completed: false, userId });
  });

  render(
    <ConvexTestProvider client={client}>
      <TodoList />
    </ConvexTestProvider>
  );

  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

**After (renderWithConvex — 3 lines):**
```tsx
test("shows todos", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

---

### 3. Data Seeding

`seed(table, data)` inserts a document and auto-fills `userId` from the default test user.

**Before:**
```typescript
await testClient.run(async (ctx) => {
  await ctx.db.insert("todos", {
    text: "Buy milk",
    completed: false,
    userId,  // Must manually track and pass userId
  });
});
```

**After:**
```typescript
await seed("todos", { text: "Buy milk", completed: false });
// userId is automatically filled from the test user
```

If your data includes an explicit `userId`, the explicit value wins:
```typescript
const bob = await createUser();
await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });
```

---

### 4. Multi-User Testing

Test data isolation between users with `createUser()`.

**Before:**
```typescript
it("users only see their own todos", async () => {
  const testClient = convexTest(schema, modules);

  // Create Alice
  const aliceId = await testClient.run(async (ctx) => ctx.db.insert("users", {}));
  const alice = testClient.withIdentity({ subject: aliceId });

  // Create Bob
  const bobId = await testClient.run(async (ctx) => ctx.db.insert("users", {}));
  const bob = testClient.withIdentity({ subject: bobId });

  // Seed data
  await alice.mutation(api.todos.create, { text: "Alice's todo" });
  await testClient.run(async (ctx) => {
    await ctx.db.insert("todos", { text: "Bob's todo", completed: false, userId: bobId });
  });

  const aliceTodos = await alice.query(api.todos.list, {});
  expect(aliceTodos).toHaveLength(1);

  const bobTodos = await bob.query(api.todos.list, {});
  expect(bobTodos).toHaveLength(1);
  expect(bobTodos[0].text).toBe("Bob's todo");
});
```

**After:**
```typescript
test("users only see their own todos", async ({ client, seed, createUser }) => {
  await client.mutation(api.todos.create, { text: "Alice's todo" });

  const bob = await createUser();
  await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });

  const aliceTodos = await client.query(api.todos.list, {});
  expect(aliceTodos).toHaveLength(1);

  const bobTodos = await bob.query(api.todos.list, {});
  expect(bobTodos).toHaveLength(1);
  expect(bobTodos[0].text).toBe("Bob's todo");
});
```

---

### 5. Auth State Testing

Test components that use `<Authenticated>`, `<Unauthenticated>`, `useConvexAuth()`, and `useAuthActions()`.

**Before (mocking auth hooks):**
```tsx
vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  Authenticated: ({ children }) => children,
  Unauthenticated: () => null,
}));

it("shows welcome when authenticated", () => {
  vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: true });
  render(<AuthGate />);
  expect(screen.getByText("Welcome back")).toBeInTheDocument();
});

it("shows sign-in when unauthenticated", () => {
  vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: false });
  render(<AuthGate />);
  expect(screen.getByText("Please sign in")).toBeInTheDocument();
});
```

**After (real auth state, no mocking):**
```tsx
test("shows welcome when authenticated", async ({ client }) => {
  renderWithConvexAuth(<AuthGate />, client);
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
});

test("shows sign-in when unauthenticated", async ({ client }) => {
  renderWithConvexAuth(<AuthGate />, client, { authenticated: false });
  expect(await screen.findByText("Please sign in")).toBeInTheDocument();
});
```

#### Prerequisites for Auth Testing

```bash
npm install -D @convex-dev/auth
```

Add the vitest plugin to resolve an internal `@convex-dev/auth` import:

```typescript
// vitest.config.ts
import { convexTestProviderPlugin } from "feather-testing-convex/vitest-plugin";

export default defineConfig({
  plugins: [
    react(),
    convexTestProviderPlugin(),
  ],
  // ... rest of config unchanged
});
```

Update your test setup to export `renderWithConvexAuth`:

```typescript
// convex/test.setup.ts
import { createConvexTest, renderWithConvex, renderWithConvexAuth } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex, renderWithConvexAuth };
```

---

### 6. Sign In / Sign Out Flows

Test interactive auth flows — `signIn()` and `signOut()` toggle real React state.

**Before (mocking useAuthActions):**
```tsx
const mockSignOut = vi.fn();
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: vi.fn(), signOut: mockSignOut }),
}));

it("sign out works", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /sign out/i }));
  expect(mockSignOut).toHaveBeenCalled();
  // But does the UI actually change? This test doesn't verify that!
});
```

**After (real state toggle, UI verification):**
```tsx
test("sign out toggles the view", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<App />, client);

  expect(await screen.findByText("Welcome back")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /sign out/i }));

  expect(await screen.findByText("Please sign in")).toBeInTheDocument();
  expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
});
```

---

### 7. Sign-In Error Simulation

Test how your component handles authentication errors.

**Before:**
```tsx
const mockSignIn = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
// ... complex mock setup
```

**After:**
```tsx
test("shows error on failed sign-in", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<App />, client, {
    authenticated: false,
    signInError: new Error("Invalid credentials"),
  });

  await user.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
});
```

---

### 8. Fluent Session DSL

Write readable, chainable test interactions using the Session DSL from `feather-testing-convex/rtl`. One fluent chain replaces multiple `userEvent` + `screen` calls.

**Before (verbose Testing Library calls):**
```tsx
test("user creates a todo", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<App />, client);

  await user.type(screen.getByLabelText("Task"), "Buy groceries");
  await user.click(screen.getByRole("button", { name: "Add Todo" }));

  expect(await screen.findByText("Buy groceries")).toBeInTheDocument();
});
```

**After (fluent Session DSL):**
```tsx
import { renderWithSession } from "feather-testing-convex/rtl";

test("user creates a todo", async ({ client }) => {
  const session = renderWithSession(<App />, client);

  await session
    .fillIn("Task", "Buy groceries")
    .clickButton("Add Todo")
    .assertText("Buy groceries");
});
```

`renderWithSession` combines `renderWithConvexAuth` + `createSession()` in one call. It returns a `Session` object with a fluent API.

#### Setup for Session DSL

```typescript
// convex/test.setup.ts
import { createConvexTest, renderWithConvex, renderWithConvexAuth } from "feather-testing-convex";
import { renderWithSession } from "feather-testing-convex/rtl";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex, renderWithConvexAuth, renderWithSession };
```

---

### 9. Scoped Interactions with `within()`

Test interactions scoped to a specific part of the page — for example, clicking a link inside a sidebar, or asserting text within a specific card.

**Before (Testing Library within):**
```tsx
import { within } from "@testing-library/react";

test("sidebar has navigation", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<App />, client);

  const sidebar = await screen.findByTestId("sidebar");
  expect(within(sidebar).getByText("Home")).toBeInTheDocument();
  expect(within(sidebar).getByText("Settings")).toBeInTheDocument();

  await user.click(within(sidebar).getByRole("link", { name: "Settings" }));
  expect(await screen.findByText("Settings Page")).toBeInTheDocument();
});
```

**After (session.within):**
```tsx
test("sidebar has navigation", async ({ client }) => {
  const session = renderWithSession(<App />, client);

  await session
    .within("[data-testid='sidebar']", (s) =>
      s.assertText("Home")
       .assertText("Settings")
       .clickLink("Settings")
    )
    .assertText("Settings Page");
});
```

`within(selector, fn)` creates a scoped session. Actions inside the callback only interact with elements inside the matched selector. After the callback, the chain returns to the full page scope.

---

### 10. Verifying Mutations via Backend

Since queries are one-shot (run once at mount), verify mutation results by querying the backend directly.

**Before (no library — manual setup + verification):**
```tsx
it("adds an item", async () => {
  const testClient = convexTest(schema, modules);
  const user = userEvent.setup();

  render(
    <ConvexTestProvider client={testClient}>
      <AddButton />
    </ConvexTestProvider>
  );

  await user.click(screen.getByRole("button", { name: "Add" }));

  const items = await testClient.query(api.items.list, {});
  expect(items).toHaveLength(1);
  expect(items[0].text).toBe("From test");
});
```

**After (with fixtures):**
```tsx
test("adds an item", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvex(<AddButton />, client);

  await user.click(screen.getByRole("button", { name: "Add" }));

  // Query backend directly — UI doesn't re-render after mutation (one-shot)
  const items = await client.query(api.items.list, {});
  expect(items).toHaveLength(1);
  expect(items[0].text).toBe("From test");
});
```

---

## Fixtures Reference

`createConvexTest(schema, modules, options?)` returns a custom Vitest `test` function with these fixtures:

| Fixture | Type | Description |
|---------|------|-------------|
| `testClient` | convex-test client | Raw unauthenticated client. Use for edge cases or direct DB access. |
| `userId` | `string` | ID of an auto-created user in the `users` table. |
| `client` | convex-test client | Authenticated client for the auto-created user. Use for most tests. |
| `seed(table, data)` | `(string, object) => Promise<string>` | Insert a document. Auto-fills `userId` unless `data` includes an explicit `userId`. Returns the document ID. |
| `createUser()` | `() => Promise<client & { userId }>` | Create another user. Returns an authenticated client with a `.userId` property. |

### Configuration

```typescript
// Default: uses "users" table
export const test = createConvexTest(schema, modules);

// Custom users table name
export const test = createConvexTest(schema, modules, { usersTable: "profiles" });
```

---

## API Reference

### Main Export (`feather-testing-convex`)

| Export | Description |
|--------|-------------|
| `createConvexTest(schema, modules, options?)` | Create a Vitest `test` function with authentication, seeding, and multi-user fixtures. |
| `renderWithConvex(ui, client)` | Render a React element with `ConvexTestProvider`. Returns Testing Library render result. |
| `renderWithConvexAuth(ui, client, options?)` | Render with `ConvexTestAuthProvider`. Supports `authenticated` and `signInError` options. |
| `wrapWithConvex(children, client)` | JSX wrapper — returns `<ConvexTestProvider>` element for custom rendering setups. |
| `ConvexTestProvider` | React component. Wraps children with a fake Convex client. Props: `client`, `children`, `authenticated?`. |
| `ConvexTestAuthProvider` | React component. Wraps with auth state + auth actions context. Props: `client`, `children`, `authenticated?`, `signInError?`. |

### Vitest Plugin (`feather-testing-convex/vitest-plugin`)

| Export | Description |
|--------|-------------|
| `convexTestProviderPlugin()` | Vite plugin that resolves the internal `@convex-dev/auth` import. Required for auth testing. |

### RTL Session DSL (`feather-testing-convex/rtl`)

| Export | Description |
|--------|-------------|
| `renderWithSession(ui, client, options?)` | Combines `renderWithConvexAuth` + `createSession()`. Returns a fluent `Session` object. |

### Playwright (`feather-testing-convex/playwright`)

| Export | Description |
|--------|-------------|
| `createConvexTest({ convexUrl, clearAll })` | Returns a Playwright `test` object extended with session fixture + auto-cleanup after each test. |

---

## Session DSL Reference

The Session DSL (from `feather-testing-core`) provides a fluent, chainable API for test interactions. Methods queue up and execute sequentially when `await`ed.

```tsx
const session = renderWithSession(<App />, client);

await session
  .fillIn("Email", "test@example.com")
  .fillIn("Password", "secret123")
  .clickButton("Sign Up")
  .assertText("Welcome, test@example.com!");
```

### Interaction Methods

| Method | Description | Example |
|--------|-------------|---------|
| `click(text)` | Click any element matching text | `session.click("Menu")` |
| `clickLink(text)` | Click a link (`<a>`) by text | `session.clickLink("Home")` |
| `clickButton(text)` | Click a button by text | `session.clickButton("Submit")` |
| `fillIn(label, value)` | Type into an input by its label or placeholder | `session.fillIn("Email", "a@b.com")` |
| `selectOption(label, option)` | Select a dropdown option | `session.selectOption("Country", "USA")` |
| `check(label)` | Check a checkbox | `session.check("Accept Terms")` |
| `uncheck(label)` | Uncheck a checkbox | `session.uncheck("Accept Terms")` |
| `choose(label)` | Select a radio button | `session.choose("Express Shipping")` |
| `submit()` | Submit the most recently interacted form | `session.submit()` |

### Assertion Methods

| Method | Description | Example |
|--------|-------------|---------|
| `assertText(text)` | Assert text is visible on the page | `session.assertText("Welcome")` |
| `refuteText(text)` | Assert text is NOT visible | `session.refuteText("Error")` |

### Scoping Methods

| Method | Description | Example |
|--------|-------------|---------|
| `within(selector, fn)` | Run interactions scoped to a DOM element | See [within() examples](#9-scoped-interactions-with-within) |

### Debugging

| Method | Description |
|--------|-------------|
| `debug()` | Log the current DOM to console (`screen.debug()`) |

### How Chaining Works

The Session uses a **thenable action-queue** pattern:
1. Each method pushes an async action onto a queue and returns `this`
2. `await` triggers sequential execution of the entire queue
3. The queue resets after execution, so you can use the same session for multiple chains

```tsx
const session = renderWithSession(<App />, client);

// Chain 1: Fill in form and submit
await session
  .fillIn("Name", "Alice")
  .clickButton("Save");

// Chain 2: Verify result (same session, fresh queue)
await session
  .assertText("Saved successfully");
```

### Error Messages

On failure, the Session provides a detailed chain trace showing exactly which step failed:

```
feather-testing-core: Step 3 of 5 failed

Failed at: clickButton('Submit')
Cause: Could not find button with name 'Submit'

Chain:
    [ok] fillIn('Email', 'test@example.com')
    [ok] fillIn('Password', 'secret123')
>>> [FAILED] clickButton('Submit')
    [skipped] assertText('Welcome')
    [skipped] refuteText('Error')
```

---

## Vitest Configuration Reference

### Minimal Config (no auth, no session DSL)

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

### Full Config (auth + session DSL)

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

### Config Options Explained

| Option | Why |
|--------|-----|
| `react()` | JSX transform for test files |
| `convexTestProviderPlugin()` | Resolves `@convex-dev/auth` internal import (auth testing only) |
| `environment: "jsdom"` | DOM APIs for React component tests |
| `environmentMatchGlobs` | Convex functions run in edge runtime, not jsdom |
| `server.deps.inline: ["convex-test"]` | convex-test must be inlined for Vitest to resolve it |
| `setupFiles` | Load jest-dom matchers (`toBeInTheDocument()`, etc.) |

---

## Complete Test Setup File

Here's the full `convex/test.setup.ts` with everything exported:

```typescript
/// <reference types="vite/client" />
import { createConvexTest, renderWithConvex, renderWithConvexAuth } from "feather-testing-convex";
import { renderWithSession } from "feather-testing-convex/rtl";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex, renderWithConvexAuth, renderWithSession };
```

---

## Playwright E2E Tests

For end-to-end tests against a running Convex backend, use the Playwright integration:

```typescript
// e2e/fixtures.ts
import { createConvexTest } from "feather-testing-convex/playwright";
import { api } from "../convex/_generated/api";

export const test = createConvexTest({
  convexUrl: process.env.VITE_CONVEX_URL!,
  clearAll: api.testing.clearAll,  // A mutation that clears test data
});

export { expect } from "@playwright/test";
```

```typescript
// e2e/app.spec.ts
import { test, expect } from "./fixtures";

test("user can create a todo", async ({ session }) => {
  await session
    .visit("/")
    .fillIn("Task", "Buy groceries")
    .clickButton("Add")
    .assertText("Buy groceries");
});
```

The Playwright `test` fixture provides:
- `session` — a fluent Session object (same API as RTL, plus `visit()`, `assertPath()`, `assertHas()`)
- Auto-cleanup — calls your `clearAll` mutation after each test

---

## Limitations

### One-Shot Query Execution (Non-Reactive)

Queries resolve **once** at component mount. After a mutation, the UI does not automatically re-render with updated data. This adapter does not simulate Convex's reactive subscription model.

**To verify backend state after a mutation:**
```tsx
await user.click(screen.getByRole("button", { name: "Add" }));
const items = await client.query(api.items.list, {});
expect(items).toHaveLength(1);
```

**To see updated data in the UI, re-mount the component:**
```tsx
const { unmount } = renderWithConvex(<TodoList />, client);
await client.mutation(api.todos.create, { text: "New todo" });
unmount();
renderWithConvex(<TodoList />, client);
expect(await screen.findByText("New todo")).toBeInTheDocument();
```

### Nested `runQuery`/`runMutation` Lose Auth Context

When a Convex function calls `ctx.runQuery()` or `ctx.runMutation()`, the nested call does not inherit the caller's auth identity. This is an [upstream limitation in convex-test](https://github.com/get-convex/convex-test/issues/50), not in this package.

**Workarounds:**
1. **Pass userId as an explicit argument** (recommended)
2. **Use `patch-package`** to fix `convex-test` directly
3. **Use actions for orchestration** — actions already propagate auth correctly

---

## Agent Skills

Install skills for AI coding agents via [skills.sh](https://skills.sh):

```bash
npx skills add siraj-samsudeen/feather-testing-convex
```

| Skill | When to Run | What It Checks |
|-------|------------|----------------|
| `setup-convex-testing` | No test config, or config errors | vitest.config.ts, test.setup.ts, deps, first test |
| `add-convex-auth-testing` | Components use auth hooks | vitest plugin, renderWithConvexAuth, @convex-dev/auth |
| `review-convex-tests` | After writing any test | 10-point quality checklist for test files |

**Sequence:** setup → (if auth) add auth → write tests → review

---

## Types

The `client` prop accepts any object with `query(ref, args)` and `mutation(ref, args)` returning promises. The result of `convexTest(schema, modules)` (and `.withIdentity(...)`) satisfies this.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

AI agents: See [CLAUDE.md](CLAUDE.md) for quick reference.

## Versioning

Releases follow [semantic versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for release history.
