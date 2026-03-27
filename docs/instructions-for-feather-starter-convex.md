# Instructions for feather-starter-convex: Deduplicate Testing Docs & Tests

The universal testing philosophy now lives in `feather-testing-convex`:
- **[TESTING-PHILOSOPHY.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md)** — MECE framework (Integration/Mock layers; E2E is a deliberate exception), decision tree, test matrix, naming convention, anti-patterns, 12-point review checklist, coverage rules
- **[README.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/README.md)** — API reference, before/after examples, Session DSL, setup guides

The starter repo should keep only **project-specific** testing details and link to the canonical source for philosophy.

---

## Changes Required

### 1. Update `.planning/codebase/TESTING.md`

This file currently mixes universal philosophy ("zero-mock approach", integration-first principle, decision trees) with project-specific details (seed helpers, file locations, Stripe workarounds).

**Split it:**

- **Remove** all universal philosophy sections (integration-first approach, when to mock, MECE principle, general anti-patterns). Replace with a single link at the top:

  ```markdown
  ## Testing Philosophy

  This project follows the [feather-testing-convex testing philosophy](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md):
  - **Integration-first**: real backend, no mocks (except loading/error states)
  - **MECE coverage**: Integration/Mock layers are MECE buckets — one test per state, no overlap, no gaps. E2E is a deliberate exception: it intentionally overlaps integration tests to provide real-browser confidence for critical user journeys
  - **Review checklist**: 12-point quality checklist for every test file (includes no snapshots, assertions must verify user-visible behavior)

  The rest of this document covers **project-specific** testing patterns.
  ```

- **Keep** all project-specific content:
  - File locations (where tests live, naming conventions)
  - Seed helpers (`seedPlans`, `seedSubscription`, `seedFreeUser`, etc.)
  - Coverage configuration specific to this project
  - Stripe/billing test workarounds
  - Environment setup (test database, env vars)
  - Any project-specific patterns or helpers

### 2. Update `.claude/rules/feather-starter-convex-testing.md`

Add one line at the very top of the file:

```markdown
> **Testing philosophy:** See [feather-testing-convex/TESTING-PHILOSOPHY.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md). This file covers project-specific setup only.
```

Keep the rest of the file as-is — it's project-specific and valuable.

### 3. Deduplicate Route-Level vs Feature-Level Tests

The route-level tests are exact copies of feature-level tests. The only unique content in the route tests is the `Route.beforeLoad` verification — this should be moved into the feature tests, and the route test files deleted.

#### Files to modify:

**`src/features/settings/settings.test.tsx`** — Add the `Route.beforeLoad` test from the route-level file. This typically looks like:

```tsx
test("settings route requires authentication", async () => {
  // Route.beforeLoad auth check test
  // Copy from src/routes/_app/_auth/dashboard/_layout.settings.index.test.tsx
});
```

**`src/features/dashboard/dashboard.test.tsx`** — Add the `Route.beforeLoad` test from:
`src/routes/_app/_auth/dashboard/_layout.index.test.tsx`

**`src/features/onboarding/onboarding.test.tsx`** — Add the `Route.beforeLoad` test from:
`src/routes/_app/_auth/onboarding/_layout.username.test.tsx`

#### Files to delete:

- `src/routes/_app/_auth/dashboard/_layout.settings.index.test.tsx`
- `src/routes/_app/_auth/dashboard/_layout.index.test.tsx`
- `src/routes/_app/_auth/onboarding/_layout.username.test.tsx`

#### Why:

Each route test file duplicates 90%+ of the feature test. The only unique part is the `Route.beforeLoad` check, which tests the route's auth guard. Moving that one test into the feature file consolidates all tests for a feature in one place, following the MECE principle (each feature = one bucket, no overlap between buckets).

---

## What NOT to Change

- **Actual test files** (the 28 feature-level test files) — these are living examples of the philosophy and should stay as-is
- **`convex/test.setup.ts`** — project-specific setup, keep as-is
- **`vitest.config.ts`** — project-specific config, keep as-is
- **Seed helpers** — these are project-specific utilities, keep them
