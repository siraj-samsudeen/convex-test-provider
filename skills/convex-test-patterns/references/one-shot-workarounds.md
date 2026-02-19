# One-Shot Query Workarounds

## Why Queries Don't Re-Run

`feather-testing-convex` runs each query **once** when the component mounts. It does not simulate Convex's reactive subscription model. After a mutation, the UI does not automatically re-render with updated data.

This is a deliberate design tradeoff — the in-memory `convex-test` client doesn't support live subscriptions.

## Workaround 1: Assert Backend State Directly

After a mutation, query the backend directly instead of checking the UI.

```tsx
test("mutation updates backend", async ({ client }) => {
  renderWithConvex(<TodoForm />, client);

  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox"), "New todo");
  await user.click(screen.getByRole("button", { name: "Add" }));

  // Don't check UI (still shows old data) — check backend directly
  const todos = await client.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
  expect(todos[0].text).toBe("New todo");
});
```

## Workaround 2: Re-Mount the Component

Unmount and remount to trigger a fresh query.

```tsx
test("re-mount shows updated data", async ({ client }) => {
  const { unmount } = renderWithConvex(<TodoList />, client);

  // Mutate via backend
  await client.mutation(api.todos.create, { text: "New todo" });

  // Unmount and re-render
  unmount();
  renderWithConvex(<TodoList />, client);

  expect(await screen.findByText("New todo")).toBeInTheDocument();
});
```

## Workaround 3: Use `rerender`

Testing Library's `rerender` triggers a fresh mount cycle.

```tsx
test("rerender shows updated data", async ({ client }) => {
  const { rerender } = renderWithConvex(<TodoList />, client);

  await client.mutation(api.todos.create, { text: "New todo" });

  // Re-render with same wrapper
  rerender(<TodoList />);

  expect(await screen.findByText("New todo")).toBeInTheDocument();
});
```

## When to Use Layer 3 Instead

If your tests fundamentally need reactive queries (live subscription updates after mutations), use a real local backend instead of `feather-testing-convex`.

### Quick Setup

```bash
npx convex backend start  # start local backend
```

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const BACKEND_URL = "http://127.0.0.1:3210";
const reactClient = new ConvexReactClient(BACKEND_URL);

render(
  <ConvexProvider client={reactClient}>
    <YourComponent />
  </ConvexProvider>
);
```

### Tradeoffs

| | feather-testing-convex | Real local backend |
|---|---|---|
| Reactive queries | No (one-shot) | Yes (live subscriptions) |
| Speed | Fast (in-memory) | Slower (real backend) |
| Setup | `npm install` only | Requires `convex backend start` |
| CI | Simple | Needs backend binary in CI |
| Mutations | Work, but UI doesn't update | Work, UI updates reactively |

**Recommendation:** Use `feather-testing-convex` for most tests. Use Layer 3 only for critical end-to-end flows that require observing reactive updates.
