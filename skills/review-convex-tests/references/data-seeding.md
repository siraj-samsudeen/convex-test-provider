# Data Seeding Patterns

## `seed()` Fixture (Recommended)

Auto-fills `userId` from the default test user. If `data` includes an explicit `userId`, the explicit value wins (spread: `{ userId, ...data }`).

```typescript
test("basic seed", async ({ client, seed }) => {
  const todoId = await seed("todos", { text: "Buy milk", completed: false });
  // todoId is the document ID
  // userId is auto-filled from the default test user

  const todos = await client.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
});
```

### Seed with explicit userId

```typescript
test("seed for a specific user", async ({ seed, createUser }) => {
  const bob = await createUser();
  await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });
  // bob.userId overrides the default userId
});
```

## Via Mutations (Tests more of the stack)

Exercises the real mutation function including validation and auth checks.

```typescript
test("via mutation", async ({ client }) => {
  await client.mutation(api.todos.create, { text: "Test todo" });

  const todos = await client.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
});
```

## Direct DB Insert (Full control)

Bypasses all Convex function logic. Use when you need to set up state that no mutation can produce.

```typescript
test("direct insert", async ({ testClient }) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("todos", {
      text: "Test",
      completed: false,
      userId: "some-specific-id",
    });
  });
});
```

## Multi-User Data Isolation

```typescript
test("users only see their own todos", async ({ client, seed, createUser }) => {
  // Default user creates a todo
  await client.mutation(api.todos.create, { text: "Alice's todo" });

  // Create Bob with his own authenticated client
  const bob = await createUser();

  // Seed a todo for Bob using explicit userId
  await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });

  // Each user only sees their own
  const aliceTodos = await client.query(api.todos.list, {});
  expect(aliceTodos).toHaveLength(1);
  expect(aliceTodos[0].text).toBe("Alice's todo");

  const bobTodos = await bob.query(api.todos.list, {});
  expect(bobTodos).toHaveLength(1);
  expect(bobTodos[0].text).toBe("Bob's todo");
});
```

## When to Use Which

| Pattern | Use when |
|---------|----------|
| `seed()` | Default choice. Quick data setup with auto userId. |
| `seed()` + explicit userId | Multi-user scenarios, testing access control. |
| Mutation | Testing the mutation itself, or when data must pass validation. |
| Direct DB | Setting up edge-case state no mutation can produce. |

## Common Mistake

Forgetting that `seed()` auto-fills `userId`. If you seed data for a different user, you must pass `userId` explicitly — otherwise it defaults to the test user and the other user won't see it.
