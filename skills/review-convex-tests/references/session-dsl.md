# Session DSL — Fluent Test Interactions

The Session DSL from `feather-testing-core` provides a chainable, fluent API for writing test interactions that read like user stories. Available through `feather-testing-convex/rtl` (for React Testing Library) and `feather-testing-convex/playwright` (for E2E).

## Setup

```typescript
// convex/test.setup.ts
import { renderWithSession } from "feather-testing-convex/rtl";
export { renderWithSession };
```

## Before/After Comparison

### Form Interaction

**Before (verbose Testing Library):**
```tsx
test("user signs up", async ({ client }) => {
  const user = userEvent.setup();
  renderWithConvexAuth(<SignupForm />, client, { authenticated: false });

  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(await screen.findByText("Welcome")).toBeInTheDocument();
  expect(screen.queryByText("Error")).not.toBeInTheDocument();
});
```

**After (Session DSL):**
```tsx
test("user signs up", async ({ client }) => {
  const session = renderWithSession(<SignupForm />, client, { authenticated: false });

  await session
    .fillIn("Email", "test@example.com")
    .fillIn("Password", "secret123")
    .clickButton("Sign Up")
    .assertText("Welcome")
    .refuteText("Error");
});
```

### Navigation and Links

**Before:**
```tsx
await user.click(screen.getByRole("link", { name: "Settings" }));
expect(await screen.findByText("Settings Page")).toBeInTheDocument();
```

**After:**
```tsx
await session
  .clickLink("Settings")
  .assertText("Settings Page");
```

### Checkboxes and Radio Buttons

**Before:**
```tsx
await user.click(screen.getByLabelText("Accept Terms"));
await user.click(screen.getByLabelText("Express Shipping"));
```

**After:**
```tsx
await session
  .check("Accept Terms")
  .choose("Express Shipping");
```

### Select Dropdowns

**Before:**
```tsx
await user.selectOptions(screen.getByLabelText("Country"), "USA");
```

**After:**
```tsx
await session.selectOption("Country", "USA");
```

## Scoped Interactions with `within()`

`within(selector, fn)` scopes all interactions in the callback to a specific DOM element. After the callback, the chain returns to full-page scope.

### Testing a Sidebar

**Before:**
```tsx
import { within } from "@testing-library/react";

const sidebar = await screen.findByTestId("sidebar");
expect(within(sidebar).getByText("Home")).toBeInTheDocument();
expect(within(sidebar).getByText("Settings")).toBeInTheDocument();
await user.click(within(sidebar).getByRole("link", { name: "Settings" }));
expect(await screen.findByText("Settings Page")).toBeInTheDocument();
```

**After:**
```tsx
await session
  .within("[data-testid='sidebar']", (s) =>
    s.assertText("Home")
     .assertText("Settings")
     .clickLink("Settings")
  )
  .assertText("Settings Page");
```

### Testing Multiple Sections

```tsx
await session
  .within("[data-testid='header']", (s) =>
    s.assertText("My App")
     .clickLink("Profile")
  )
  .within("[data-testid='main']", (s) =>
    s.assertText("Profile Page")
     .fillIn("Display Name", "Alice")
     .clickButton("Save")
  )
  .assertText("Saved successfully");
```

## Multiple Chains Per Session

The session resets its queue after each `await`. Use the same session object for multiple chains:

```tsx
const session = renderWithSession(<App />, client);

// Chain 1: Navigate and fill form
await session
  .clickLink("New Todo")
  .fillIn("Task", "Buy groceries")
  .clickButton("Save");

// Chain 2: Verify (fresh queue, same session)
await session.assertText("Buy groceries");
```

## Error Messages

On failure, you get a detailed trace of the entire chain:

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

## Full Method Reference

### Interactions
| Method | What it does |
|--------|-------------|
| `click(text)` | Click any element with matching text |
| `clickLink(text)` | Click a link (`<a>`) by text |
| `clickButton(text)` | Click a button by text |
| `fillIn(label, value)` | Type into an input by label or placeholder |
| `selectOption(label, option)` | Choose a dropdown option |
| `check(label)` | Check a checkbox |
| `uncheck(label)` | Uncheck a checkbox |
| `choose(label)` | Select a radio button |
| `submit()` | Submit the most recently interacted form |

### Assertions
| Method | What it does |
|--------|-------------|
| `assertText(text)` | Assert text is visible |
| `refuteText(text)` | Assert text is NOT visible |

### Scoping
| Method | What it does |
|--------|-------------|
| `within(selector, fn)` | Run interactions scoped to a CSS selector |

### Debug
| Method | What it does |
|--------|-------------|
| `debug()` | Log current DOM to console |

## RTL vs Playwright

The RTL Session (`feather-testing-convex/rtl`) supports all the methods above. The Playwright Session (`feather-testing-convex/playwright`) adds:

| Method | Playwright only |
|--------|----------------|
| `visit(path)` | Navigate to a URL |
| `assertPath(path, opts?)` | Assert current URL path |
| `refutePath(path)` | Assert NOT on a path |
| `assertHas(selector, opts?)` | Assert element exists (CSS selector, with count/text/exact) |
| `refuteHas(selector, opts?)` | Assert element does NOT exist |

## Common Mistakes

- **Not awaiting the session chain** — Session methods queue up but don't execute until `await`. Always `await` the chain.
- **Using `screen.getBy*` alongside session** — The Session wraps Testing Library. Use session methods instead for consistency.
- **Forgetting `within()` returns to parent scope** — After the callback, the chain is back to full-page scope. This is by design.
