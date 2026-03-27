# feather-testing-convex

### How do you test a React component that fetches data from Convex?

| Approach | Tests backend logic | Tests component rendering | Tests the integration | Fast | Code coverage |
|----------|:---:|:---:|:---:|:---:|:---:|
| Backend-only (`convex-test`) | ✅ | ❌ | ❌ | ✅ | Partial |
| Component with mocks (`vi.mock`) | ❌ | ✅ | ❌ | ✅ | Partial |
| E2E (Playwright) | ✅ | ✅ | ✅ | ❌ | None |
| **This library** | **✅** | **✅** | **✅** | **✅** | **Full** |

Say you have a `<TodoList>` component that calls `useQuery(api.todos.list)` to fetch and display todos.

**If you test the backend alone** (`convex-test`), you can prove the query returns the right data — but you have no idea if your React component actually calls it correctly or renders the result. You've tested half the picture.

**If you test the component alone** (mocking `useQuery`), you can prove it renders whatever data you hand it — but the "data" is a mock you wrote. It can drift from what the backend actually returns. Your test passes, your app is broken.

**If you write a Playwright E2E test**, you get real integration — but it's slow, needs a running backend, and gives you no code coverage.

There's a gap in the middle: **no fast, in-process way to test a React component against a real Convex backend.**

### This library fills that gap

`feather-testing-convex` wires [convex-test](https://www.npmjs.com/package/convex-test)'s in-memory backend into React's provider tree. Your component calls `useQuery` → hits a real Convex function → gets real data → renders it. All in Vitest. No mocks, no server, full coverage.

```tsx
test("shows todos", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

### The MECE Testing Principle

MECE (**Mutually Exclusive, Collectively Exhaustive**) is a decomposition principle from McKinsey consulting: break a problem into buckets where nothing overlaps and nothing is missed. Applied to testing: decompose your component into **visual states**, then write **one test per state**. Within each test, assert as many aspects of that state as needed.

```tsx
function TodoList() {
  const todos = useQuery(api.todos.list);
  if (todos === undefined) return <div>Loading...</div>;       // State 1: Mock
  if (todos.length === 0) return <div>No todos yet</div>;      // State 2: Integration
  return <ul>{todos.map(t => <li key={t._id}>{t.text}</li>)}</ul>;  // State 3: Integration
}
```

**3 states → 3 tests → 100% coverage → zero overlap:**

| State (bucket) | Approach | Why |
|----------------|----------|-----|
| Loading spinner | **Mock** | Transient — query resolves too fast to observe |
| Empty list | **Integration** | Real query returns `[]` naturally |
| With data | **Integration** | Real query returns real data |

**Integration is the default. Mocks are the exception** — only for transient states (loading spinners) and error states that can't be produced from a real backend. Never mock `useQuery` to return data you could seed instead.

MECE governs the Integration and Mock layers. **E2E (Playwright) is a deliberate exception** — it intentionally overlaps integration tests for critical user journeys (sign up, checkout, onboarding) to provide real-browser confidence. Keep E2E to ~10 smoke tests covering the paths that, if broken, mean the product is broken.

> 📖 **Full guide:** [TESTING-PHILOSOPHY.md](TESTING-PHILOSOPHY.md) — the MECE framework, decision tree, test matrix workflow, naming convention, anti-pattern examples, 12-point review checklist, and coverage rules.

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

### 11. TanStack React Query Components

Test components that use `@tanstack/react-query` with `@convex-dev/react-query` bridge — i.e., `useQuery(convexQuery(...))` instead of Convex's `useQuery`.

**The Problem:** Components using `convexQuery()` get `undefined` data with the basic `ConvexTestProvider` because TanStack Query needs its own `QueryClientProvider` and `queryFn`.

**The Solution:** Use `feather-testing-convex/tanstack-query` — it provides a custom `queryFn` that routes Convex query keys to the in-memory test backend.

#### Setup

```bash
npm install -D @tanstack/react-query @convex-dev/react-query
```

```typescript
// convex/test.setup.ts
import { createConvexTest } from "feather-testing-convex";
import { renderWithConvexQuery, renderWithConvexQueryAuth } from "feather-testing-convex/tanstack-query";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvexQuery, renderWithConvexQueryAuth };
```

#### Basic Query Test

```tsx
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

function UserProfile() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));
  if (!user) return <div>Loading...</div>;
  return <h1>Welcome, {user.username}</h1>;
}

test("shows user profile", async ({ client, testClient, userId }) => {
  await testClient.run(async (ctx) => ctx.db.patch(userId, { username: "alice" }));
  renderWithConvexQueryAuth(<UserProfile />, client);
  expect(await screen.findByText("Welcome, alice")).toBeInTheDocument();
});
```

#### Mutation with Auto-Refresh (Key Advantage!)

Unlike the base `ConvexTestProvider` (one-shot), the TanStack Query provider **auto-invalidates queries after mutations**. The UI updates without re-mounting:

```tsx
function TodoApp() {
  const { data: todos } = useQuery(convexQuery(api.todos.list, {}));
  const addTodo = useMutation(api.todos.create);  // convex/react useMutation
  if (!todos) return <div>Loading...</div>;
  return (
    <div>
      <ul>{todos.map(t => <li key={t._id}>{t.text}</li>)}</ul>
      <button onClick={() => addTodo({ text: "New todo" })}>Add</button>
    </div>
  );
}

test("adds todo and UI updates automatically", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexQueryAuth(<TodoApp />, client);

  await user.click(screen.getByRole("button", { name: "Add" }));

  // ✅ UI auto-updates — no re-mount needed!
  expect(await screen.findByText("New todo")).toBeInTheDocument();
});
```

#### Auth-Aware Tests

```tsx
test("authenticated user sees their data", async ({ client }) => {
  renderWithConvexQueryAuth(<UserProfile />, client);
  expect(await screen.findByText(/Welcome/)).toBeInTheDocument();
});

test("unauthenticated user sees nothing", async ({ testClient }) => {
  renderWithConvexQuery(<UserProfile />, testClient);
  expect(await screen.findByText("Loading...")).toBeInTheDocument();
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

### TanStack Query (`feather-testing-convex/tanstack-query`)

| Export | Description |
|--------|-------------|
| `renderWithConvexQuery(ui, client)` | Render with `QueryClientProvider` + `ConvexProvider`. For components using `useQuery(convexQuery(...))`. |
| `renderWithConvexQueryAuth(ui, client, options?)` | Auth-aware version. Supports `authenticated` and `signInError` options. |
| `ConvexTestQueryProvider` | React component. Wraps with `QueryClientProvider` + `ConvexProvider` with auto query invalidation. Props: `client`, `children`, `authenticated?`. |
| `ConvexTestQueryAuthProvider` | React component. Auth-aware version with `signIn`/`signOut` context. Props: `client`, `children`, `authenticated?`, `signInError?`. |
| `createTestQueryFn(client)` | Custom `queryFn` for advanced `QueryClient` setup. Routes `["convexQuery", ...]` keys to the test backend. |
| `createTestQueryClient(client)` | Pre-configured `QueryClient` factory (`retry: false`, `gcTime: Infinity`, custom `queryFn`). |

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

### For TanStack Query Apps

If your app uses `@tanstack/react-query` + `@convex-dev/react-query`, add:

```typescript
/// <reference types="vite/client" />
import { createConvexTest } from "feather-testing-convex";
import { renderWithConvexQuery, renderWithConvexQueryAuth } from "feather-testing-convex/tanstack-query";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvexQuery, renderWithConvexQueryAuth };
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

### One-Shot Query Execution (Non-Reactive) — `ConvexTestProvider` only

When using `ConvexTestProvider` / `renderWithConvex`, queries resolve **once** at component mount. After a mutation, the UI does not automatically re-render with updated data.

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

> **Note:** This limitation does **not** apply to the TanStack Query provider (`ConvexTestQueryProvider` / `renderWithConvexQuery`). Those automatically invalidate queries after mutations, so the UI updates without re-mounting.

### Nested `runQuery`/`runMutation` Lose Auth Context

When a Convex function calls `ctx.runQuery()` or `ctx.runMutation()`, the nested call does not inherit the caller's auth identity. This is an [upstream limitation in convex-test](https://github.com/get-convex/convex-test/issues/50), not in this package.

**Workarounds:**
1. **Pass userId as an explicit argument** (recommended)
2. **Use `patch-package`** to fix `convex-test` directly
3. **Use actions for orchestration** — actions already propagate auth correctly

---

## Agent Skills

AI coding agent skills for Convex testing are included in [feather-flow](https://github.com/siraj-samsudeen/feather-flow):

```bash
npx feather-flow
```

This installs all feather-flow skills including:

| Skill | When to Run | What It Checks |
|-------|------------|----------------|
| `/feather:setup-convex-testing` | No test config, or config errors | vitest.config.ts, convex/test.setup.ts, Convex deps |
| `/feather:add-convex-auth-testing` | Components use auth hooks | vitest plugin, renderWithConvexAuth, @convex-dev/auth |
| `/feather:review-convex-tests` | After writing any test | 12-point quality checklist for test files |

**Sequence:** setup-react-testing → setup-convex-testing → (if auth) add-convex-auth-testing → write tests → review-convex-tests

---

## Types

The `client` prop accepts any object with `query(ref, args)` and `mutation(ref, args)` returning promises. The result of `convexTest(schema, modules)` (and `.withIdentity(...)`) satisfies this.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

AI agents: See [CLAUDE.md](CLAUDE.md) for quick reference.

## Versioning

Releases follow [semantic versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for release history.
