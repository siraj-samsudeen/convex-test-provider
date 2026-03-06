---
name: add-convex-auth-testing
description: "Checklist: Can tests use <Authenticated>, useConvexAuth(), useAuthActions()? Verify or add vitest plugin, renderWithConvexAuth export, @convex-dev/auth dep."
license: MIT
metadata:
  author: siraj-samsudeen
  version: "0.4"
---

# Add Convex Auth Testing

Verify or add auth testing support. Enables testing components that use `<Authenticated>`, `<Unauthenticated>`, `useConvexAuth()`, and `useAuthActions()` — without mocking.

**Dual-purpose:** Use this checklist to add auth testing from scratch OR to fix auth-related test failures.

**Prerequisite:** Basic testing must already be set up (see `setup-convex-testing`).

---

## Checklist

### ☐ 1. @convex-dev/auth installed

**Check:**
```bash
npm ls @convex-dev/auth
```

**If missing:**
```bash
npm install -D @convex-dev/auth
```

### ☐ 2. Vitest plugin added

**Check:** `vitest.config.ts` includes `convexTestProviderPlugin()` in plugins array.

`ConvexTestAuthProvider` imports from an internal `@convex-dev/auth` path. The plugin adds a resolve alias so Vite can find it.

**If missing, update vitest.config.ts:**
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

**Common error:** `ERR_PACKAGE_PATH_NOT_EXPORTED` → plugin is missing.

### ☐ 3. renderWithConvexAuth exported from test setup

**Check:** `convex/test.setup.ts` exports `renderWithConvexAuth`.

**If missing, update convex/test.setup.ts:**
```typescript
// convex/test.setup.ts
/// <reference types="vite/client" />
import { createConvexTest, renderWithConvex, renderWithConvexAuth } from "feather-testing-convex";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);
export { renderWithConvex, renderWithConvexAuth };
```

### ☐ 4. Auth tests work

**Verify with a minimal auth test:**

```tsx
import { test, renderWithConvexAuth } from "../../convex/test.setup";
import { screen } from "@testing-library/react";
import { expect } from "vitest";

test("shows authenticated view", async ({ client }) => {
  renderWithConvexAuth(<App />, client);
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
});
```

**Run:**
```bash
npx vitest run
```

If you see `ERR_PACKAGE_PATH_NOT_EXPORTED`, go back to step 2 (vitest plugin is missing).

---

## Usage Reference

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
