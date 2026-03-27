# Instructions for feather-flow: Thin Down Convex-Specific Skills

The testing philosophy and Convex-specific documentation now live in `feather-testing-convex`:
- **[TESTING-PHILOSOPHY.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md)** — MECE framework (Integration/Mock layers; E2E is a deliberate exception), decision tree, test matrix, naming convention, anti-patterns, 12-point review checklist, coverage rules
- **[README.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/README.md)** — API reference, before/after examples, Session DSL reference, setup guides

The 3 Convex-specific skills in feather-flow currently duplicate this content. They should be thinned down to **checklists that link to the canonical source** instead of repeating it.

---

## Changes Required

### 1. `feather:setup-convex-testing/SKILL.md`

**Keep:** The checklist structure (install deps → verify vitest.config.ts → verify convex/test.setup.ts → verify src/test-setup.ts → first test passes → coverage optional).

**Remove:** The entire "⚠️ Philosophy: Integration Tests First" section (anti-pattern examples, correct pattern code, "when to mock" table, fixtures reference table, query behavior note). All of this is now in the README and TESTING-PHILOSOPHY.md.

**Add at the top of the skill (after the title/description):**

```markdown
> **Testing Philosophy:** See [feather-testing-convex/TESTING-PHILOSOPHY.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md) for the integration-first approach, MECE framework, and decision tree.
>
> **API Reference & Examples:** See the [feather-testing-convex README](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/README.md) for fixtures, Session DSL, before/after examples, and setup files.
```

### 2. `feather:add-convex-auth-testing/SKILL.md`

**Keep:** The checklist (install @convex-dev/auth → add vitest plugin → export renderWithConvexAuth → auth tests work) and the common mistakes section (missing vitest plugin, importing plugin in test files).

**Remove:** The duplicated usage patterns (authenticated default, unauthenticated, signIn/signOut toggle, error simulation code examples) and `ConvexTestAuthProvider` props reference. These are all in the README's "Features with Before/After Examples" sections 5-7.

**Add at the top:**

```markdown
> **Auth Testing Examples:** See the [feather-testing-convex README](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/README.md#5-auth-state-testing) sections 5 (Auth State Testing), 6 (Sign In/Sign Out Flows), and 7 (Sign-In Error Simulation).
```

### 3. `feather:review-convex-tests/SKILL.md`

**Replace the entire 10-point checklist** with a link to the canonical source. The 10-point checklist now lives in [TESTING-PHILOSOPHY.md § Test Review Checklist](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md#test-review-checklist).

**New content should be:**

```markdown
# feather:review-convex-tests

Review Convex test files against the feather testing philosophy.

## Checklist

Apply the **12-point review checklist** from [feather-testing-convex/TESTING-PHILOSOPHY.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md#test-review-checklist):

1. No mocked backend for data-display tests
2. No redundant backend-only tests
3. Mocks ONLY for transient states
4. Using `seed()` instead of raw DB inserts
5. Using Session DSL for form interactions
6. Session DSL chains are awaited
7. Not asserting stale UI after mutations
8. Using `findByText` for async data, not `getByText`
9. Multi-user tests use explicit `userId` with `seed`
10. MECE test design — Integration/Mock layers are MECE buckets (no overlap); E2E is a deliberate exception that intentionally overlaps integration tests to provide real-browser confidence for happy paths
11. No snapshot tests — assert specific user-visible values instead
12. Assertions verify user-visible behavior, not just execution — every test must contain at least one `findByText`, `findByRole`, or `getByText`

See the full checklist with examples and rationale in [TESTING-PHILOSOPHY.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md#test-review-checklist).
```

### 4. Delete `feather:review-convex-tests/references/*.md`

Delete all 3 reference files — they are exact duplicates of README sections:

| Reference file | Duplicates |
|---------------|------------|
| `references/data-seeding.md` | README § "Data Seeding" + "Fixtures Reference" |
| `references/one-shot-workarounds.md` | README § "Limitations: One-Shot Query Execution" |
| `references/session-dsl.md` | README § "Session DSL Reference" |

---

## What NOT to Change

These skills are **framework-agnostic** and should remain as-is:

- `feather:write-tests/SKILL.md` — general TDD discipline (RED-GREEN-REFACTOR)
- `feather:write-tests/testing-anti-patterns.md` — general anti-patterns (mock behavior, test-only methods)
- `feather:work-slice/SKILL.md` — workflow enforcement ("FORBIDDEN: separate backend/frontend tests")
- `feather:setup-tdd-guard/SKILL.md` — TDD guard hooks
- `feather:setup-react-testing/SKILL.md` — React testing setup
- `feather:derive-tests/SKILL.md` — Gherkin derivation
