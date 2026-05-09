# Auth Testing Reference

## withIdentity — subject format

`testClient.withIdentity({ subject: userId })` works correctly when `userId` is a raw `Id<"users">` string. The `@convex-dev/auth` library's `getAuthUserId` implementation splits the subject on `"|"` to separate provider prefix from the ID. A raw Convex `Id<"users">` contains no pipe character, so it is used as-is — no special formatting needed.

```tsx
const userId = await testClient.run(async (ctx: any) =>
  ctx.db.insert("users", { email: "alice@example.com" }),
);
// Works — userId is a plain Id<"users"> string with no "|"
const authed = testClient.withIdentity({ subject: userId });
```

## authTables — use testClient.run(), not seed()

The `authTables` tables (`users`, `sessions`, `accounts`, `verificationCodes`) are created by `@convex-dev/auth` with document validators. `seed()` bypasses auth context but not document validators — inserting a plain `{ email }` object into `users` via `seed()` will throw a validator error.

```tsx
// ❌ Throws — authTables has document validators that reject plain inserts
await seed("users", { email: "alice@example.com" });

// ✅ testClient.run() uses ctx.db directly, bypassing validators
const userId = await testClient.run(async (ctx: any) =>
  ctx.db.insert("users", { email: "alice@example.com" }),
);
```

## { authenticated: false } — skip async auth subscription settle

`renderWithSession` with a real auth identity waits for the auth subscription to settle before resolving. In practice this adds ~1 second per test. When the test does not need an authenticated user, pass `{ authenticated: false }` to skip this wait:

```tsx
// ❌ Waits ~1s for auth settle even though we don't need auth
const session = renderWithSession(<App />, testClient);

// ✅ Skips auth settle — fast
const session = renderWithSession(<App />, testClient, { authenticated: false });
await session.assertText("Sign in");
```

Pass `{ authenticated: false }` for any unauthenticated state test. Only omit it (or pass a real identity via `withIdentity`) when the test actually needs an authenticated user.

## Testing the "user deleted after auth" branch

The `user?.email ?? null` branch (where a query looks up an authenticated user that no longer exists) is reachable in `convex-test` via `db.delete()`. This branch does NOT need a `/* v8 ignore */` annotation.

```tsx
test("viewer returns null when user document is deleted after auth", async ({ testClient }) => {
  const userId = await testClient.run(async (ctx: any) =>
    ctx.db.insert("users", { email: "x@example.com" }),
  );
  const authed = testClient.withIdentity({ subject: userId });
  await testClient.run(async (ctx: any) => ctx.db.delete(userId));
  const result = await authed.query(api.users.viewer, {});
  expect(result).toBeNull();
});
```

`convex-test`'s `DatabaseFake` returns `null` for deleted IDs — `db.get(deletedId)` is `null`, making this branch deterministically reachable.
