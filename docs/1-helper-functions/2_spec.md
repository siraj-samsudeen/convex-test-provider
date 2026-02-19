# Helper Functions Specification

> GitHub Issue: [#1](https://github.com/siraj-samsudeen/feather-testing-convex/issues/1)

## Overview

Add helper functions to `feather-testing-convex` that reduce test boilerplate from ~15 lines to ~2 lines per test.

---

## Requirements

### R1: Test Factory Function

**`createConvexTest(schema, modules, options?)`**

Creates a Vitest test function with pre-configured fixtures.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | `SchemaDefinition` | Yes | Convex schema from `convex/schema.ts` |
| `modules` | `Record<string, Module>` | Yes | Convex modules from `import.meta.glob()` |
| `options.usersTable` | `string` | No | Table name for users (default: `"users"`) |

**Returns:** Vitest `test` function with fixtures attached.

---

### R2: Fixtures

The test function must provide these fixtures via destructuring:

| Fixture | Type | Description |
|---------|------|-------------|
| `testClient` | `TestConvex` | Raw convex-test client, unauthenticated |
| `userId` | `Id<UsersTable>` | Current user's document ID |
| `client` | `TestConvex` | Authenticated client for current user |
| `seed` | `SeedFunction` | Insert data with auto-filled `userId` |
| `createUser` | `CreateUserFunction` | Create another authenticated user |

#### R2.1: `testClient` Fixture
- Fresh `convexTest(schema, modules)` instance per test
- No identity attached

#### R2.2: `userId` Fixture
- Inserts a document into the users table
- Returns the document ID as string
- Depends on `testClient`

#### R2.3: `client` Fixture
- Calls `testClient.withIdentity({ subject: userId })`
- Depends on `testClient` and `userId`

#### R2.4: `seed(table, data)` Function
- Inserts data into specified table
- Auto-fills `userId` field with current user's ID
- Returns the inserted document ID
- Signature: `<T extends TableName>(table: T, data: Omit<TableData<T>, "userId">) => Promise<Id<T>>`

#### R2.5: `createUser()` Function
- Creates a new user in users table
- Returns authenticated client for that user
- Can be called multiple times for multi-user tests
- Signature: `() => Promise<TestConvex>`

---

### R3: Render Helpers

#### R3.1: `wrapWithConvex(children, client)`
- Wraps children in `<ConvexTestProvider client={client}>`
- Returns JSX element
- No external dependencies

#### R3.2: `renderWithConvex(ui, client)`
- Calls Testing Library's `render()` with provider wrapper
- Returns standard RTL result (`screen`, `rerender`, etc.)
- Requires `@testing-library/react` (optional peer dependency)
- Throws helpful error if Testing Library not installed

---

### R4: TypeScript Support

- Full type inference for fixtures
- `seed()` should infer table shape from schema
- `createUser()` return type matches `client` type

---

### R5: Peer Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| `react` | Yes | ConvexTestProvider is a React component |
| `convex` | Yes | ConvexProvider, types |
| `convex-test` | Yes | Testing client |
| `vitest` | Yes | test.extend() API |
| `@testing-library/react` | **Optional** | Only for `renderWithConvex()` |

---

## Constraints

### C1: Schema Agnostic
- Must not hardcode any table names in implementation
- Users table name configurable via `usersTable` option
- `seed()` works with any table that has `userId` field

### C2: No Anonymous Functions for Common Cases
- User should not need to write `ctx.db.insert()` calls
- Package provides high-level `seed()` and `createUser()` functions
- Only custom scenarios (extra user fields, different auth) need callbacks

### C3: Lazy Evaluation
- Fixtures only execute when accessed (Vitest behavior)
- Test using only `testClient` should not create a user

### C4: Test Isolation
- Each test gets fresh `testClient` instance
- No state shared between tests

---

## Non-Requirements

- No built-in assertion helpers (use Vitest's `expect`)
- No automatic cleanup (convex-test handles this)
- No support for non-Vitest test runners

---

## Acceptance Criteria

1. [ ] `createConvexTest()` returns a working Vitest test function
2. [ ] All 5 fixtures work correctly
3. [ ] `seed()` auto-fills `userId`
4. [ ] `createUser()` returns authenticated client
5. [ ] `renderWithConvex()` works with Testing Library
6. [ ] `wrapWithConvex()` works without Testing Library
7. [ ] TypeScript types are correct
8. [ ] Existing `ConvexTestProvider` export still works
9. [ ] README updated with examples
10. [ ] Package tests use the new helpers (dogfooding)
