# Session DSL Reference

The Session DSL is a fluent interface shared across Integration (React Testing Library adapter) and E2E (Playwright adapter) tests. Methods queue up and execute on `await`.

## Method table

| Method | Integration | E2E | Description |
|--------|-------------|-----|-------------|
| `fillIn(label, value)` | ✅ | ✅ | Types into the field with the given accessible label |
| `clickButton(name)` | ✅ | ✅ | Clicks the button with the given accessible name |
| `assertText(text)` | ✅ | ✅ | Asserts the text is visible on screen |
| `refuteText(text)` | ✅ | ✅ | Asserts the text is NOT visible |
| `click(selector)` | ✅ | ✅ | Clicks an arbitrary element |
| `submit(formName?)` | ✅ | ✅ | Submits a form |
| `within(selector, fn)` | ✅ | ✅ | Scopes subsequent assertions to a DOM subtree |
| `visit(path)` | ❌ | ✅ | Navigates to a URL — Playwright only |
| `assertPath(path)` | ❌ | ✅ | Asserts the current URL path — Playwright only |
| `assertHas(selector)` | ❌ | ✅ | Asserts an element exists — Playwright only |
| `refuteHas(selector)` | ❌ | ✅ | Asserts an element does not exist — Playwright only |

Do not use Playwright-only methods in integration tests — they will throw.

## Chaining, not sequential awaits

Methods return `this`, enabling a fluent chain. The chain executes when `await`ed.

```tsx
// ❌ Sequential awaits — each line creates a new execution context
await session.fillIn("Email", "a@b.com");
await session.clickButton("Sign in");
await session.assertText("Welcome");

// ✅ Single chained await
await session
  .fillIn("Email", "a@b.com")
  .clickButton("Sign in")
  .assertText("Welcome");
```

Sequential `await session.X()` calls are not an error — they work — but they break the contract of the DSL. The chained form is required by convention.

## assertText accepts strings only

`assertText` takes a plain string, not a React element or JSX. Passing a React element will silently fail the assertion.

```tsx
// ❌ JSX element
await session.assertText(<span>Welcome, alice!</span>);

// ✅ Plain string
await session.assertText("Welcome, alice!");
```

## within() for scoped assertions

When the same text appears in multiple places, scope the assertion:

```tsx
await session
  .within(".todo-list", async (s) => {
    await s.assertText("Buy milk");
  })
  .within(".completed-list", async (s) => {
    await s.refuteText("Buy milk");
  });
```

## Creating a session

**Integration:**
```tsx
const session = renderWithSession(<App />, testClient.withIdentity({ subject: userId }));
await session.assertText("Welcome");
```

**Integration (unauthenticated):**
```tsx
const session = renderWithSession(<App />, testClient, { authenticated: false });
await session.assertText("Sign in");
```

**E2E (Playwright):**
```tsx
test("user signs in", async ({ session }) => {
  await session
    .visit("/")
    .assertText("Sign in");
});
```
