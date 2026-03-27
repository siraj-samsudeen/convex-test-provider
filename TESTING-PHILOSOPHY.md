# Feather Testing Philosophy

The canonical guide to testing React + Convex applications with `feather-testing-convex`. This document is the single source of truth — all other references (feather-flow skills, project READMEs) should link here.

---

## The MECE Testing Framework

MECE stands for **Mutually Exclusive, Collectively Exhaustive** — a problem-decomposition principle from McKinsey consulting (Barbara Minto, 1960s). The idea: break a problem into **buckets** where no item belongs to two buckets (ME) and nothing falls outside all buckets (CE).

**A McKinsey example:** To analyze revenue decline, you decompose into "New Customer Revenue" + "Existing Customer Revenue." Every dollar belongs to exactly one bucket. Nothing is missed. Within each bucket, you analyze from multiple angles — pipeline volume, win rate, deal size — but the *buckets* don't overlap.

**Applied to testing, MECE governs the Integration and Mock layers:**

- Each component state belongs to exactly one test approach — Integration OR Mock (Mutually Exclusive)
- Every possible state has a test covering it — no gaps (Collectively Exhaustive)
- Within each test, assert multiple aspects of that state — UI text, element visibility, backend state, accessibility role, count

MECE constrains *how many tests you write* (one per state). It does NOT constrain *how many assertions each test contains*. A thorough test of one state is not overlap — it's rigor within a single bucket.

**E2E tests (Playwright) are a deliberate exception to MECE.** E2E tests intentionally cover the same happy paths that integration tests cover — but from a different angle: real browser, real network, real user journey. This overlap is intentional. E2E provides a quality of confidence that in-process tests cannot, especially for critical paths like sign up, checkout, and onboarding. Keep E2E to ~10 smoke tests; they exist outside the MECE decomposition.

**Multiple assertions per test are encouraged.** Each assertion verifies a different aspect of the same state: UI text, element visibility, backend state, accessibility role, count. Splitting these into separate one-assertion tests produces test explosion and is the most common mistake AI agents make.

### Example: TodoList Component

```tsx
function TodoList() {
  const todos = useQuery(api.todos.list);
  if (todos === undefined) return <div>Loading...</div>;       // State 1: Loading
  if (todos.length === 0) return <div>No todos yet</div>;      // State 2: Empty
  return (                                                      // State 3: With data
    <div>
      <ul>{todos.map(t => <li key={t._id}>{t.text}</li>)}</ul>
      <p>{todos.filter(t => t.completed).length} of {todos.length} completed</p>
    </div>
  );
}
```

**3 states → 3 tests → 100% coverage → zero overlap:**

| State (bucket) | Test approach | Why |
|----------------|--------------|-----|
| Loading spinner | **Mock** `useQuery` to return `undefined` | Loading is transient — the real query resolves too fast to observe |
| Empty list | **Integration** with no seeded data | Real query returns `[]` naturally |
| With data | **Integration** with seeded data | Real query returns real data |

```tsx
// State 1: Loading — mock (the only state that needs it)
test("shows loading spinner", () => {
  vi.mocked(useQuery).mockReturnValue(undefined);
  render(<TodoList />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});

// State 2: Empty — integration (real backend, no data)
test("shows empty state", async ({ client }) => {
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("No todos yet")).toBeInTheDocument();
});

// State 3: With data — one test, multiple assertions verifying this state
test("shows seeded data with completion count", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  await seed("todos", { text: "Walk dog", completed: true });
  renderWithConvex(<TodoList />, client);

  // All assertions verify the same state: "component rendered with data"
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
  expect(screen.getByText("Walk dog")).toBeInTheDocument();
  expect(screen.getByText("1 of 2 completed")).toBeInTheDocument();
});
```

This is the target: **decompose into states (the MECE buckets), assign each state exactly one test, verify each state thoroughly.**

---

## The Three Testing Layers

Not every test type serves the same purpose. Each layer has a specific job:

### Layer 1: E2E Tests (Playwright) — Happy Path Protection

Playwright tests cover the **critical user journeys** — the paths that, if broken, mean the product is broken. Sign up, create a resource, upgrade a plan, complete checkout. These are the happy paths.

```typescript
test("user signs up and creates first todo", async ({ session }) => {
  await session
    .visit("/signup")
    .fillIn("Email", "alice@example.com")
    .fillIn("Password", "secret123")
    .clickButton("Sign Up")
    .assertText("Welcome, alice!")
    .fillIn("Task", "Buy groceries")
    .clickButton("Add")
    .assertText("Buy groceries");
});
```

E2E tests are **slow and expensive** — run them only for the journeys that matter most. They provide the highest confidence (real browser, real backend, real network) but the lowest coverage-per-test.

### Layer 2: Integration Tests — The Workhorse

Integration tests (this library) cover **happy paths AND core failure paths** with a real in-memory backend. This is where the bulk of your coverage comes from. They verify that React components correctly call backend functions and render the results.

```tsx
// Happy path — data displays correctly
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});

// Core failure path — empty state handled correctly
test("shows empty state", async ({ client }) => {
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("No todos yet")).toBeInTheDocument();
});
```

Integration tests are **fast** (in-memory, no server) and **high-confidence** (real data flow). Default to this layer for everything you can.

### Layer 3: Unit/Mock Tests — Edge Cases Only

Mock tests cover **what integration tests can't reach**: transient states (loading spinners), error conditions, and specific branch coverage for edge cases.

```tsx
// Transient state — can't observe with real backend
test("shows loading spinner", () => {
  vi.mocked(useQuery).mockReturnValue(undefined);
  render(<TodoList />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});
```

If you find yourself writing a mock test for a state you *could* produce with `seed()`, you're in the wrong layer. Push it up to integration.

### The Hierarchy

```
E2E (Playwright)     → Exception to MECE: intentionally overlaps integration for real-browser confidence.
                       Happy paths only. ~10 smoke tests. Slow, highest confidence.
Integration (this)   → MECE layer: happy paths + core failures. Fast, high confidence, bulk of coverage.
Unit/Mock            → MECE layer: edge cases only. Fast, low confidence (data can drift).
```

---

## The Decision Tree

For each component state, choose the approach in this order:

```
Is this a critical user journey (sign up, checkout, core workflow)?
├─ YES → E2E test (Playwright — real browser, real backend)
│        AND integration test (for fast CI coverage of the same path)
└─ NO  → Can I produce this state with a real in-memory backend?
         ├─ YES → Integration test (seed data, render component, assert UI)
         └─ NO  → Mock test (mock the hook, render, assert)
```

**Integration tests are the default.** E2E tests guard happy paths. Mocks are the exception.

| State | Approach | Why |
|-------|----------|-----|
| Critical user journey | **E2E + Integration** | E2E for real-browser confidence (exception to MECE), integration for fast CI coverage |
| Data loaded | **Integration** | Real query returns real data |
| Empty state | **Integration** | Real query returns `[]` |
| Loading spinner | **Mock** | Transient — query resolves too fast to observe |
| Error state | **Mock** | Can't reliably produce errors from a real backend |
| Reactive UI updates | **E2E** | `ConvexTestProvider` queries are one-shot (TanStack Query provider handles this) |
| Everything else | **Integration** | Real backend + real React |

---

## Why Integration-First?

### The Problem with the Popular Pattern

Most React + backend tutorials teach you to write tests at two separate layers:

```tsx
// ❌ Layer 1: Backend-only test (tests the query in isolation)
test("todos.list returns user's todos", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const authed = t.withIdentity({ subject: userId });
  await t.run(async (ctx) => {
    await ctx.db.insert("todos", { text: "Buy milk", completed: false, userId });
  });
  const todos = await authed.query(api.todos.list, {});
  expect(todos).toHaveLength(1);
});

// ❌ Layer 2: Component test with mocked backend
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

test("TodoList renders items", () => {
  vi.mocked(useQuery).mockReturnValue([{ _id: "1", text: "Buy milk", completed: false }]);
  render(<TodoList />);
  expect(screen.getByText("Buy milk")).toBeInTheDocument();
});
```

**This gives you 2 tests that overlap in coverage but miss the integration between layers.** The backend test proves the query works. The component test proves rendering works. But neither test proves that the component correctly calls the query and renders the real data.

### What This Library Enables

**One integration test replaces both isolated tests:**

```tsx
// ✅ One test covers backend + component + data flow
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

This single test verifies:
- ✅ The Convex query function executes correctly
- ✅ The React component calls `useQuery` with the right arguments
- ✅ Data flows from the in-memory backend through `useQuery` to the UI
- ✅ The component renders the data correctly

---

## The Anti-Pattern: Testing at Every Layer

AI coding agents (LLMs) default to the "layers" approach because that's the dominant pattern in React testing tutorials. When asked to write tests, they produce:

1. **Backend-only tests** — testing queries/mutations in isolation with `convex-test`
2. **Component tests with mocks** — mocking `useQuery`/`useMutation` and testing rendering
3. **E2E tests on top** — Playwright tests for every feature, not just critical journeys

The problem with (1) and (2): they overlap with each other but miss the integration between layers — the exact place where bugs hide. The problem with (3): E2E tests are a valid deliberate exception to MECE (real-browser confidence for critical paths), but agents apply them to every feature instead of ~10 smoke tests for critical journeys.

**The fix:** Delete the backend-only test and the mocked component test. Write one integration test that seeds data, renders the component, and asserts what the user sees. Use the MECE framework to ensure no gaps.

### Snapshot Tests

Snapshot tests are a separate anti-pattern that AI agents reach for because they require zero thought about what to assert:

```tsx
// ❌ Snapshot test — says nothing about what the component should do
test("renders correctly", () => {
  render(<TodoList />);
  expect(container).toMatchSnapshot();
});
```

Four problems with snapshots (Justin Searls):
1. **You don't understand them** — when they fail, you're reverse-engineering what changed
2. **They encode output without intent** — "this is what it renders" vs "this is why it should render this way"
3. **They get rubber-stamped** — reviewers run `--updateSnapshot` instead of investigating
4. **High false-negative rate** — library upgrades, date changes, and cosmetic tweaks break them without any real regression

**No snapshot tests. Assert specific user-visible values instead:**

```tsx
// ✅ Assert what the user actually sees and cares about
test("shows seeded data with completion count", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  await seed("todos", { text: "Walk dog", completed: true });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
  expect(screen.getByText("Walk dog")).toBeInTheDocument();
  expect(screen.getByText("1 of 2 completed")).toBeInTheDocument();
});
```

---

## Test Review Checklist

When reviewing Convex test files, check these 10 points:

### 1. No mocked backend for data-display tests
If a component calls `useQuery` and displays the result, it should be an integration test with `renderWithConvex` + `seed`, **not** a mock of `useQuery`.

### 2. No redundant backend-only tests
If an integration test already renders a component that calls `api.todos.list`, a separate backend-only test for `api.todos.list` is redundant. Delete it — the integration test covers both layers.

### 3. Mocks ONLY for transient states
The only legitimate uses of mocks in Convex testing:
- **Loading spinners** — `useQuery` returns `undefined` transiently
- **Error states** — can't reliably produce from a real backend

Everything else should be integration.

### 4. Using `seed()` instead of raw DB inserts
```tsx
// ❌ Verbose, manual userId
await testClient.run(async (ctx) => {
  await ctx.db.insert("todos", { text: "Buy milk", completed: false, userId });
});

// ✅ Concise, auto-fills userId
await seed("todos", { text: "Buy milk", completed: false });
```

### 5. Using Session DSL for form interactions
```tsx
// ❌ Verbose userEvent + screen calls
await user.type(screen.getByLabelText("Email"), "a@b.com");
await user.click(screen.getByRole("button", { name: "Submit" }));

// ✅ Fluent Session DSL
await session.fillIn("Email", "a@b.com").clickButton("Submit");
```

### 6. Session DSL chains are awaited
Methods queue up and execute on `await`. Forgetting `await` means assertions run before actions complete.

### 7. Not asserting stale UI after mutations
With `ConvexTestProvider`, queries are one-shot. After a mutation, either:
- Assert backend state: `const items = await client.query(api.items.list, {});`
- Re-mount the component: `unmount(); renderWithConvex(<Component />, client);`
- Use TanStack Query provider (auto-invalidates queries after mutations)

### 8. Using `findByText` for async data, not `getByText`
Data from `useQuery` resolves asynchronously. Use `findByText` (waits) instead of `getByText` (immediate).

### 9. Multi-user tests use explicit `userId` with `seed`
Without an explicit `userId`, `seed()` auto-fills the default test user. For multi-user tests, pass `userId` explicitly:
```tsx
const bob = await createUser();
await seed("todos", { text: "Bob's todo", completed: false, userId: bob.userId });
```

### 10. MECE test design — no overlap, no gaps
Decompose the component into visual states (the MECE buckets). Each state gets exactly one test — no two tests cover the same state, no state is left untested. Within each test, assert multiple aspects of that state thoroughly. See [The MECE Testing Framework](#the-mece-testing-framework) above.

### 11. No snapshot tests
Any `toMatchSnapshot()` call in a component test is a flag. Replace with specific assertions against user-visible text, roles, and counts. See [Snapshot Tests](#snapshot-tests) above.

### 12. Assertions verify user-visible behavior, not execution
Every assertion must answer: "Would this fail if the component returned an empty div?" If NO, the assertion is meaningless. Flag:
- `expect(x).toBeDefined()` — proves nothing
- `expect(x).toBeTruthy()` — proves nothing
- `expect(container).toBeInTheDocument()` — proves the component mounted, not that it rendered correctly

Every integration test must contain at least one `findByText`, `findByRole`, or `getByText` — proving real, user-visible content rendered.

---

## The Test Matrix: Define Before You Write

Before an agent writes any tests, the human defines the test matrix — the MECE decomposition of component states. This is Kent Beck's Canon TDD Step 1: "Write a list of the test scenarios you want to cover" — before writing any code or test code.

**Why this matters:** When an agent defines the matrix itself (given only "write tests for this component"), it defaults to structural coupling — one test per prop, one test per method — producing N×M tests with overlapping coverage. When you define the matrix, the agent fills slots you control.

### The workflow

**Step 1: Human writes the matrix** (in the issue, PR description, or as a comment block at the top of the test file):

```markdown
## Test Matrix: TodoList

| # | State | Approach | What to verify |
|---|-------|----------|----------------|
| 1 | Loading | Mock useQuery → undefined | shows loading spinner |
| 2 | Empty | Integration, no seed | shows empty state message |
| 3 | With data | Integration, seed 2 todos | renders items + completion count |
| 4 | Error | Mock useQuery → Error | shows error message, no crash |
```

**Step 2: Agent fills the matrix** — one test per row, using the specified approach.

**Step 3: Human reviews** — the matrix has 4 rows, the test file should have 4 tests. If it has 8, something went wrong.

### Starting template

Use this as a starting point and refine for each component:

```markdown
## Test Matrix: [ComponentName]

| # | State | Approach | What to verify |
|---|-------|----------|----------------|
| 1 | Loading | Mock | spinner visible, no data rendered |
| 2 | Empty | Integration | empty state message, no list |
| 3 | With data | Integration | items visible, counts correct, interactions work |
| 4 | Error | Mock | error message, no crash |
```

Most components have 3–5 states. If your matrix has more than 7 rows, the component is doing too much — decompose it first.

---

## Test Naming Convention

Test names serve a dual purpose: they describe intent for the reviewer, and they become the spec when read as a list. A well-named test suite reads like feature documentation.

### The pattern

```
"[verb] [what the user sees] [condition if needed]"
```

| ✅ Good | ❌ Bad |
|---------|--------|
| `"shows loading spinner"` | `"renders correctly when loading"` |
| `"shows empty state when no todos"` | `"should display empty state message when there are no todo items"` |
| `"shows todo items with completion count"` | `"renders the todo list component with items"` |
| `"shows error message when fetch fails"` | `"handles error state"` |
| `"marks todo as completed on click"` | `"test checkbox interaction"` |

### Rules

- **Start with a verb** describing what the user sees: `shows`, `hides`, `navigates to`, `displays`, `marks`
- **Name the visible output**, not the mechanism: `"shows error message"` not `"handles error state"`
- **Add a condition** when it disambiguates: `"when no todos"`, `"after sign out"`, `"on first load"`
- **Keep it under ~8 words** — if it needs more, the test is covering too much
- **Never use "should"** — it adds length without adding meaning

### The spec-list test

Read your test names as a list. They should describe the feature without reading the code:

```
TodoList
  ✓ shows loading spinner
  ✓ shows empty state when no todos
  ✓ shows todo items with completion count
  ✓ marks todo as completed on click
```

If this list makes sense to a new developer who has never seen the component, the names are good. If it's confusing, rewrite the names before the agent writes the code.

---

## Coverage Rules

### Target: 100% line coverage

This isn't perfectionism. It's **protection for multi-agent development.**

When multiple AI agents work on features in parallel, any one of them can silently modify, delete, or break code that another feature depends on. If a line of code has no test covering it, that line can change without anyone noticing. The agent that broke it won't know. The agent working on the other feature won't know. You won't know — until the bug surfaces days later, buried under layers of accumulated changes.

**100% coverage means every line, every branch has a test standing guard.** If an agent touches code that another feature depends on, a test fails immediately. The feedback loop is instant, not delayed.

This is achievable with the MECE approach without test bloat:
- **Integration tests** cover happy paths and core failure paths — this alone gets you to ~80-90% coverage
- **Mock tests** cover the remaining edge cases (loading, error states) — filling the last 10-20%
- **E2E tests** don't contribute to code coverage but guard the critical journeys

### Vitest v8 coverage configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "convex/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/test.setup.ts",
        "convex/_generated/**",
      ],
    },
  },
});
```

### `v8 ignore` — humans only

Some code paths genuinely can't be reached in tests (e.g., exhaustive switch defaults, framework-required error boundaries). Use `v8 ignore` comments only for these:

```typescript
// v8 ignore next 2 — exhaustive switch default, TypeScript ensures this is unreachable
default:
  throw new Error(`Unexpected state: ${state}`);
```

**Rule: Agents must never add `v8 ignore` comments. Only the human can.**

An agent told to achieve 100% coverage has two paths: write a meaningful test, or add `v8 ignore`. The second is easier and silently removes protection. Every `v8 ignore` in the codebase must be a conscious human decision, documented with a reason.

### Preventing meaningless tests

100% coverage can be gamed — an agent can write `expect(result).toBeDefined()` to execute a line without verifying anything. The safeguard is the review process, not additional rules:

- **`feather:review-convex-tests`** catches weak assertions: `toBeDefined`, `toBeTruthy`, `toMatchSnapshot`, tautological assertions. Every assertion must verify user-visible behavior.
- **ESLint** enforces the ban on `toMatchSnapshot()` and `v8 ignore` structurally — these fire automatically without requiring review.

Coverage is the floor. The review process is the ceiling.

---

## Putting It All Together

When writing tests for a new component:

1. **Write the test matrix** — list all visual states, classify each (integration or mock), give each a name. This is the human's job. See [The Test Matrix](#the-test-matrix-define-before-you-write).
2. **Name each test** before the agent writes code. The names are the spec. See [Test Naming Convention](#test-naming-convention).
3. **Agent fills the matrix** — one test per row, using the specified approach.
4. **Use `seed()` for data setup**, `renderWithConvex` for rendering, Session DSL for interactions.
5. **Assert multiple aspects per test** — every assertion should verify something the user would see or care about. No `toBeDefined`, no snapshots.
6. **Run `feather:review-convex-tests`** — applies the 12-point checklist before you review.
7. **Check coverage**: run `vitest --coverage` and ensure all lines are hit. If a line is uncovered, either write a test or have a human add `v8 ignore` with justification.

This approach gives you fewer tests with better coverage, faster execution, no false confidence from mocked data, and a test suite small enough to review without fatigue.
