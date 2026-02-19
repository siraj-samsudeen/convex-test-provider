---
name: add-convex-auth-testing
description: Add auth testing to an existing Convex test setup. Test <Authenticated>, <Unauthenticated>, useConvexAuth(), useAuthActions(), signIn/signOut.
license: MIT
metadata:
  author: siraj-samsudeen
  version: "0.3"
---

# Add Auth Testing to Convex Tests

Enables testing components that use `<Authenticated>`, `<Unauthenticated>`, `useConvexAuth()`, and `useAuthActions()` — without mocking. Requires basic testing to already be set up (see `/setup-convex-testing`).

## When to Use

- Project already has `feather-testing-convex` set up
- Components use Convex auth hooks/components and need tests

---

## 1. Install

```bash
npm install -D @convex-dev/auth
```

## 2. Add Vitest Plugin

`ConvexTestAuthProvider` imports from an internal `@convex-dev/auth` path. The plugin adds a resolve alias so Vite can find it.

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { convexTestProviderPlugin } from "feather-testing-convex/vitest-plugin";

export default defineConfig({
  plugins: [
    react(),
    convexTestProviderPlugin(),  // resolves @convex-dev/auth internal import
  ],
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["convex/**", "edge-runtime"]],
    server: { deps: { inline: ["convex-test"] } },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

> Upstream fix requested: [convex-auth#281](https://github.com/get-convex/convex-auth/issues/281). Plugin can be removed once the context is publicly exported.

## 3. Update Test Setup

```typescript
// convex/test.setup.ts
/// <reference types="vite/client" />
import { createConvexTest, renderWithConvex, renderWithConvexAuth } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex, renderWithConvexAuth };
```

## 4. Usage

| Scenario | Example below |
|----------|---------------|
| Component assumes logged in | Authenticated |
| Component shows login prompt | Unauthenticated |
| Test sign-out flow | signIn / signOut |
| Test error handling | Simulate errors |
| Custom render wrapper | Direct provider |

### Authenticated (default)

```tsx
import { test, renderWithConvexAuth } from "../../convex/test.setup";

test("shows authenticated view", async ({ client }) => {
  renderWithConvexAuth(<App />, client);

  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
});
```

### Unauthenticated

```tsx
test("shows sign-in prompt", async ({ client }) => {
  renderWithConvexAuth(<App />, client, { authenticated: false });

  expect(await screen.findByText("Please sign in")).toBeInTheDocument();
});
```

### signIn / signOut toggle auth state

`signIn()` sets authenticated to true. `signOut()` sets authenticated to false. Both trigger re-render.

```tsx
import userEvent from "@testing-library/user-event";

test("sign out toggles the view", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<App />, client);

  await user.click(screen.getByRole("button", { name: /sign out/i }));
  expect(await screen.findByText("Please sign in")).toBeInTheDocument();
});

test("sign in toggles the view", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<App />, client, { authenticated: false });

  await user.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
});
```

### Simulate sign-in errors

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

### Direct `ConvexTestAuthProvider` (custom wrapping)

```tsx
import { ConvexTestAuthProvider } from "feather-testing-convex";

<ConvexTestAuthProvider client={client} authenticated={true} signInError={someError}>
  <YourComponent />
</ConvexTestAuthProvider>
```

## 5. Verify

```bash
npx vitest run
```

Auth tests should pass. If you see `ERR_PACKAGE_PATH_NOT_EXPORTED`, the vitest plugin is missing (step 2).

---

## API Reference

### `renderWithConvexAuth(ui, client, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `authenticated` | `boolean` | `true` | Initial auth state |
| `signInError` | `Error` | `undefined` | Error thrown when `signIn()` is called |

### `ConvexTestAuthProvider` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `client` | `ConvexTestClient` | required | convex-test client or `.withIdentity()` client |
| `authenticated` | `boolean` | `true` | Initial auth state |
| `signInError` | `Error` | `undefined` | Error thrown on `signIn()` |

---

## Common Mistakes to Avoid

- **Missing vitest plugin** → `[ERR_PACKAGE_PATH_NOT_EXPORTED]` error from Vite. Add `convexTestProviderPlugin()` to your vitest.config.ts plugins.
- **Importing vitest plugin in test files** → The plugin is for `vitest.config.ts` only, not test files. In tests, import `renderWithConvexAuth` from `feather-testing-convex`.
- **Using `signIn`/`signOut` without `renderWithConvexAuth`** → Only `ConvexTestAuthProvider` (used internally by `renderWithConvexAuth`) wires up the auth actions context. Plain `ConvexTestProvider` doesn't provide it.
- **Expecting `signIn()` to trigger backend auth** → `signIn`/`signOut` only toggle the local auth state for UI testing. They don't call real auth endpoints.
