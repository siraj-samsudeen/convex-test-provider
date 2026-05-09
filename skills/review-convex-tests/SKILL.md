---
name: review-convex-tests
description: "Review Convex test files against the 12-point checklist in TESTING-PHILOSOPHY.md. Flags weak assertions, wrong test layers, DSL misuse, and coverage shortcuts."
allowed-tools: Read Bash
---

<objective>
Review one or more Convex test files against the 12-point checklist below. Load the reference files for detail on specific topics. Report every violation with a line reference, a concrete fix, and a severity label.
</objective>

---

## Step 1 — Identify files to review

If the user named a file or pattern, use that. Otherwise review all test files changed in the current branch:

```bash
git diff --name-only main | grep -E "\.test\.(ts|tsx)$"
```

If no test files are changed, ask: "Which test file(s) should I review?"

---

## Step 2 — Load references

Read these before reviewing — they contain the ❌/✅ examples and API details you need:

- `references/data-seeding.md` — seed() vs testClient.run(), multi-user patterns, auth table traps
- `references/session-dsl.md` — Session DSL method table, chaining vs sequential awaits, Playwright-only methods
- `references/one-shot-workarounds.md` — why queries don't re-run after mutations, three workarounds
- `references/auth-testing.md` — withIdentity subject format, { authenticated: false } timing, authTables trap

---

## Step 3 — Apply the checklist

For each test file, check all 12 points. Read the full file before flagging — some patterns are only wrong in context.

### 1. No mocked backend for data-display tests
If a component calls `useQuery` and displays the result, it must be an integration test with `renderWithSession` + data seeding — not a mock of `useQuery`. Mocking `useQuery` for a state that a real in-memory backend would return is the wrong layer.

**Exception:** loading state (`useQuery` returns `undefined`) — always Mock, never Integration. See `references/data-seeding.md`.

### 2. No redundant backend-only tests
If an integration test renders a component that calls `api.X.Y`, a separate backend-only test for `api.X.Y` is redundant. The integration test covers both layers.

### 3. Mocks ONLY for transient or unreachable states
Legitimate mock targets: loading spinners (`useQuery → undefined`), error states that can't be produced from a real backend, states blocked by auth guards in production code. Everything else: push to integration.

### 4. seed() vs testClient.run() — use seed() for normal data
```tsx
// ❌ Verbose
await testClient.run(async (ctx: any) => ctx.db.insert("todos", { text: "Buy milk" }));

// ✅ Concise
await seed("todos", { text: "Buy milk" });
```
Exception: `authTables` (users, sessions, accounts, verificationCodes) — use `testClient.run()` because `seed()` bypasses auth validators. See `references/data-seeding.md`.

### 5. Session DSL for interactions — and chain calls, don't sequential-await
```tsx
// ❌ Verbose userEvent + screen
await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
await userEvent.click(screen.getByRole("button", { name: "Submit" }));

// ❌ Sequential awaits — breaks DSL chaining contract
await session.fillIn("Email", "a@b.com");
await session.clickButton("Submit");

// ✅ Single chained await
await session.fillIn("Email", "a@b.com").clickButton("Submit");
```
Multiple sequential `await session.X()` calls are a flag — chain them instead.

### 6. findByText for async data, not getByText
Data from `useQuery` resolves asynchronously. `getByText` throws immediately if the element isn't present yet. Every integration test that waits for backend data must use `findByText` or `findByRole`.

### 7. Not asserting stale UI after mutations
With `ConvexTestProvider`, queries are one-shot — they don't re-run after mutations. See `references/one-shot-workarounds.md` for the three valid patterns.

### 8. Multi-user tests pass explicit userId to seed()
Without an explicit `userId`, `seed()` auto-fills the default test user. Multi-user tests must pass `userId` explicitly:
```tsx
const bob = await createUser();
await seed("todos", { text: "Bob's todo", userId: bob.userId });
```

### 9. MECE design — no overlap, no gaps
One test per visual state. No two tests cover the same state; no state is left untested. Within each test, assert multiple aspects of that state. See [TESTING-PHILOSOPHY.md — The MECE Testing Framework].

### 10. No snapshot tests
Any `toMatchSnapshot()` is a flag. Replace with specific assertions against user-visible text, roles, and counts.

### 11. Assertions verify user-visible behavior, not execution
Every assertion must answer: "Would this fail if the component returned an empty div?" Flag:
- `expect(x).toBeDefined()` — proves nothing
- `expect(x).toBeTruthy()` — proves nothing
- `expect(container).toBeInTheDocument()` — proves mounting, not rendering

Every integration test needs at least one `findByText`, `findByRole`, or `getByText` proving real user-visible content rendered.

### 12. Test names describe what the user sees
Pattern: `"[verb] [what the user sees] [condition if needed]"`. Never "should". Never implementation-focused names like "handles the error case" or "renders correctly".

### 13. Inline arrow handlers in JSX are separate V8 coverage entries
```tsx
// onClick={() => doThing()} is a separate function entry in V8 coverage
// If no test clicks this button, it shows 0% in the functions metric
```
Flag any `onClick={() => ...}` (or similar inline handlers) where no test action triggers that button/element.

---

## Step 4 — Report

Output a numbered list. For each finding:
- File and line number
- Which checklist point it violates
- Why it matters in practice (one sentence)
- Concrete fix (code snippet if helpful)
- Severity: `[BLOCKER]` (will fail coverage gate or produce false confidence), `[GAP]` (wrong layer or missing test), `[IMPROVEMENT]` (cleaner pattern)

End with: "N blockers, M gaps, P improvements found."

Do not apply fixes — report only. The user decides what to change.
