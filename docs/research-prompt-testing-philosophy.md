# Research Prompt: Testing Philosophy for Human-AI Collaborative Development

## Context

I maintain an npm library (`feather-testing-convex`) that enables integration testing of React + Convex apps. I also use AI coding agents (Claude, Cursor, etc.) extensively — they write most of my code and tests, and I review and approve.

My workflow:
1. I write specs and test descriptions (the "what")
2. AI agents write the implementation and test code (the "how")
3. I review the tests and code, approve or reject
4. Tests become my **contracts** — they're how I verify the agent built what I actually had in mind

**The problem I keep hitting:**
When the agent generates numerous tests that are hard to read, I get fatigued. I start approving in bulk. Days later I discover both the tests and the code have accumulated technical debt — overlapping coverage, mocked data that drifted from reality, tests that pass but don't actually verify the right thing. By then, it's unmanageable garbage.

**My current stance:**
I use an "integration-first, MECE" approach — one test per component state, real backend where possible, mocks only for transient states. This keeps test count low and each test meaningful. But I want to pressure-test this against the broader testing literature and LLM training defaults.

## What I Want to Understand

### 1. What Are LLMs Actually Trained On?

Research the dominant testing patterns in the most popular React/TypeScript tutorials, courses, and open-source projects that form LLM training data:

- **Testing Library docs** (Kent C. Dodds) — what do the official examples teach?
- **Next.js / Vercel examples** — how do their starter templates structure tests?
- **Popular React courses** (Udemy, Frontend Masters, egghead) — what testing patterns do they teach?
- **Top GitHub repos** (>10k stars) with React + testing — how do they organize tests?
- **Stack Overflow consensus** — what answers get the most upvotes for "how to test React components"?

I want to know: when an LLM writes tests unprompted, what pattern is it defaulting to, and why? Is it the AAA pattern (Arrange-Act-Assert)? Is it one-assertion-per-test? Is it the testing pyramid? What are the specific habits baked into training data?

### 2. The Legendary Figures — Practical Positions, Not Slogans

Go deep on the **actual, nuanced positions** of these people. Not the Twitter soundbites — the blog posts, talks, and books where they explain their reasoning:

#### Kent Beck (inventor of TDD, XP)
- What does he actually say about test granularity? (His recent Substack "Tidy First?" has evolved positions)
- His concept of "programmer tests" vs "customer tests" — which maps to my workflow?
- "I get paid for code that works, not for tests" — what's the full context?
- His position on test overlap vs test independence
- What does he say about tests as communication/documentation?

#### DHH (creator of Rails, vocal testing contrarian)
- "TDD is dead" — but what replaced it in his actual practice?
- His concept of "system tests" vs "unit tests" — how does this map to React?
- His position on test speed vs test confidence
- The Rails testing defaults (system tests, integration tests, model tests) — what's the actual ratio he recommends?
- His 2023-2024 writing on testing (post-"TDD is dead" era) — has his position evolved?

#### Kent C. Dodds (Testing Library creator, React testing authority)
- The "Testing Trophy" vs the "Testing Pyramid" — what's the actual argument?
- "Write tests. Not too many. Mostly integration." — what does he mean by "not too many"?
- His position on mocking — when does he say it's OK vs not?
- His "Avoid the Test User" principle — how does this apply to agent-generated tests?
- AHA Testing (Avoid Hasty Abstractions) — what's the practical takeaway?

#### Martin Fowler
- The practical testing pyramid — what ratios does he actually recommend?
- His position on test doubles (mocks, stubs, fakes) — when are they harmful?
- "Unit test" definition debate — solitary vs sociable tests

#### Gary Bernhardt
- "Functional Core, Imperative Shell" — how does this affect test strategy?
- His "Boundaries" talk — what's the practical testing implication?

#### James Shore (Art of Agile Development)
- "Testing Without Mocks" — his actual pattern for integration testing
- His position on test speed vs test correctness

### 3. The "Human Reviewer" Problem

This is MY specific problem and I haven't seen it discussed much. Research:

- **Cognitive load in code review** — what does the research say about reviewer fatigue?
- **Test readability research** — is there academic or industry work on "how many tests can a reviewer meaningfully read before quality drops"?
- **"Given-When-Then" / BDD style** — does this actually improve readability for reviewers, or just add verbosity?
- **Test naming conventions** — which naming pattern maximizes "scan-ability"? (e.g., `test("shows error when email is invalid")` vs `it("should display an error message when the user enters an invalid email format")`)
- **The "test as specification" idea** — can test descriptions serve as a feature spec that a human can read without reading the test code?

### 4. Anti-Patterns That Specifically Hurt Human-AI Workflows

Research patterns that are fine in traditional development but become toxic when an AI agent is writing the tests:

- **One assertion per test** — does this help or hurt when an agent generates 47 tests for a simple form?
- **Comprehensive edge case testing** — when does "thorough" become "noise"?
- **Test-per-method** — backend unit test for every function, even when integration tests already cover them
- **Mock-heavy tests** — when the agent mocks 5 things and tests the wiring between them
- **Snapshot tests** — are these useful or just rubber-stampable noise?
- **Test duplication across layers** — same behavior tested in unit, integration, AND e2e

### 5. What Actually Works in Practice?

Find real-world case studies, not theory:

- **Companies that dramatically reduced test count** and what happened to quality
- **The Shopify testing story** — they talked about moving from unit-heavy to integration-heavy
- **The GitHub testing approach** — how they test a large Rails + React app
- **Basecamp/37signals** — DHH's company, their actual test suite structure
- **Stripe** — known for good testing, what's their approach?

### 6. The Specific Tension I Want Resolved

Help me think through these specific trade-offs:

**Trade-off 1: Align with LLM defaults vs. fight them**
If LLMs default to "backend-only test + mocked component test" and I force "integration test only," every AI interaction starts with a correction. Is the integration-test-only approach worth the friction? Or is there a middle ground where I accept some of the LLM's defaults?

**Trade-off 2: Fewer tests vs. explicit coverage**
My MECE approach produces ~3 tests per component. A traditional approach might produce ~8-12. Fewer tests = easier review. But does the reviewer lose context about what's covered? Is there a "just right" number?

**Trade-off 3: Test readability vs. test isolation**
Integration tests are more readable (they describe user behavior). Unit tests are more isolated (they pinpoint failures). For a human reviewer who needs to understand intent, which is better?

**Trade-off 4: Prescriptive rules vs. judgment**
I currently give agents strict rules ("never mock useQuery for data display"). Should I instead give principles ("prefer integration tests") and let the agent use judgment? Which produces better outcomes when the agent is writing 90% of the code?

**Trade-off 5: Test as contract vs. test as safety net**
I use tests as contracts ("this is what I want you to build"). Traditional testing uses tests as safety nets ("this catches regressions"). These serve different purposes — can one test suite serve both?

## Output Format

I want a research document structured as:

1. **Findings** — what each source actually says (with quotes and links)
2. **Synthesis** — where the experts agree, where they disagree, and why
3. **Recommendations for my workflow** — specific, actionable positions I should take, with reasoning
4. **What to keep from my current approach** — what's already aligned with best practice
5. **What to change** — where I'm fighting unnecessarily or missing something important
6. **The testing contract** — a proposed set of principles for "tests as human-AI contracts"

---

## Appendix: Our Current Testing Philosophy

**Important:** Complete the research above independently first. Then compare your findings against the philosophy below. Identify where it's strong, where it's wrong, where it's missing something, and where the terminology or framing could better align with established literature.

---

# Feather Testing Philosophy

The canonical guide to testing React + Convex applications with `feather-testing-convex`. This document is the single source of truth — all other references (feather-flow skills, project READMEs) should link here.

---

## The MECE Testing Framework

MECE stands for **Mutually Exclusive, Collectively Exhaustive** — a problem-decomposition principle from McKinsey consulting (Barbara Minto, 1960s). The idea: break a problem into **buckets** where no item belongs to two buckets (ME) and nothing falls outside all buckets (CE).

**A McKinsey example:** To analyze revenue decline, you decompose into "New Customer Revenue" + "Existing Customer Revenue." Every dollar belongs to exactly one bucket. Nothing is missed. Within each bucket, you analyze from multiple angles — pipeline volume, win rate, deal size — but the *buckets* don't overlap.

**Applied to testing:** Every React component has a finite set of **visual states**. These states are your MECE buckets. Each state gets **exactly one test** (no overlap between tests), and every state has a test (no gaps). Within each test, you **assert multiple aspects** of that state — MECE constrains how many tests you write, not how many assertions each test contains.

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
| Critical user journey | **E2E + Integration** | E2E for confidence, integration for fast CI |
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
Decompose the component into visual states (the MECE buckets). Each state gets exactly one test — no two tests cover the same state, no state is left untested. Within each test, assert multiple aspects of that state. See [The MECE Testing Framework](#the-mece-testing-framework) above.

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

### `v8 ignore` for genuinely unreachable code

Some code paths can't be reached in tests (e.g., exhaustive switch defaults, framework-required error boundaries). Use `v8 ignore` comments:

```typescript
// v8 ignore next 2
default:
  throw new Error(`Unexpected state: ${state}`);
```

Document every `v8 ignore` with a comment explaining why the code is unreachable in tests. This is an escape hatch, not a habit — each one should be justified.

---

## Putting It All Together

When writing tests for a new component:

1. **List all visual states** the component can be in
2. **Classify each state**: Can it be produced with a real backend? (Integration) Or is it transient/error? (Mock)
3. **Write one test per state** using the appropriate approach
4. **Use `seed()` for data setup**, `renderWithConvex` for rendering, Session DSL for interactions
5. **Verify the MECE property**: each state has exactly one test (no overlap between tests, no gaps), with thorough assertions within each test
6. **Check coverage**: run `vitest --coverage` and ensure all lines are hit

This approach gives you fewer tests with better coverage, faster execution, and no false confidence from mocked data that drifts from reality.
