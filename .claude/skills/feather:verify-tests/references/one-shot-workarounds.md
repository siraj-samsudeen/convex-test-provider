# One-Shot Query Workarounds

## Why queries don't re-run after mutations

`ConvexTestProvider` (the integration test backend) runs queries once at mount time. Unlike the production Convex client, it does not watch for changes and re-run queries when data changes. This means:

```tsx
// ❌ This does NOT work — query has already resolved; the list won't update
await testClient.run(async (ctx) => ctx.db.insert("todos", { text: "New item" }));
expect(screen.getByText("New item")).toBeInTheDocument(); // fails
```

## Three valid workarounds

### 1. Assert backend state directly (preferred for mutation tests)

Skip the UI entirely — query the backend after the mutation:

```tsx
test("adds a todo", async ({ client, seed }) => {
  const session = renderWithSession(<AddTodo />, client);
  await session.fillIn("Task", "Buy milk").clickButton("Add");

  const todos = await client.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
  expect(todos[0].text).toBe("Buy milk");
});
```

### 2. Re-mount the component

Unmount and re-render to trigger a fresh query:

```tsx
const { unmount } = renderWithSession(<TodoList />, client);
await client.mutation(api.todos.add, { text: "Buy milk" });
unmount();
const session2 = renderWithSession(<TodoList />, client);
await session2.assertText("Buy milk");
```

### 3. Use TanStack Query provider

`renderWithSession` has a `tanstackQuery: true` option that wraps the component with a TanStack Query provider. This provider auto-invalidates queries after mutations, giving live-update behavior:

```tsx
const session = renderWithSession(<TodoList />, client, { tanstackQuery: true });
await session.fillIn("Task", "Buy milk").clickButton("Add");
await session.assertText("Buy milk"); // works — query re-ran after mutation
```

Use TanStack Query when testing reactive UI updates (list updates, count changes, filter changes). Use backend assertions when testing that mutations persisted correctly.
