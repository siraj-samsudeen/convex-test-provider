# Data Seeding Reference

## seed() — the default

`seed()` is a fixture available in integration tests. It inserts a row into the given table and auto-fills `userId` with the default test user.

```tsx
test("shows task list", async ({ client, seed }) => {
  await seed("todos", { title: "Buy milk", completed: false });
  const session = renderWithSession(<TodoList />, client);
  await session.assertText("Buy milk");
});
```

Use `seed()` for all ordinary application tables.

## testClient.run() — for auth tables and complex setups

`seed()` is a thin wrapper around a Convex mutation that bypasses normal auth context. `authTables` (the `users`, `sessions`, `accounts`, and `verificationCodes` tables created by `@convex-dev/auth`) have validators that reject plain object inserts — `seed()` will throw.

For auth tables, use `testClient.run()` to insert directly via the internal `ctx.db` API, which bypasses validators:

```tsx
const userId = await testClient.run(async (ctx: any) =>
  ctx.db.insert("users", { email: "alice@example.com" }),
);
```

This is also the pattern for any setup that needs to return the inserted ID (for use in `withIdentity` or further setup).

## Multi-user tests

Without an explicit `userId`, `seed()` inserts as the default test user. For multi-user scenarios, pass `userId` explicitly:

```tsx
const alice = await createUser();
const bob = await createUser();
await seed("todos", { title: "Alice's task", userId: alice.userId });
await seed("todos", { title: "Bob's task", userId: bob.userId });
```

## Deleted-row testing

To test behavior when a row is deleted after auth (e.g., the `user?.email ?? null` branch in a viewer query), insert with `testClient.run()`, capture the ID, then delete it:

```tsx
const userId = await testClient.run(async (ctx: any) =>
  ctx.db.insert("users", { email: "x@example.com" }),
);
const authed = testClient.withIdentity({ subject: userId });
await testClient.run(async (ctx: any) => ctx.db.delete(userId));
const result = await authed.query(api.users.viewer, {});
expect(result).toBeNull();
```

`db.get(deletedId)` returns `null` in convex-test's `DatabaseFake` — this branch is reachable and does not warrant a `/* v8 ignore */` annotation.
