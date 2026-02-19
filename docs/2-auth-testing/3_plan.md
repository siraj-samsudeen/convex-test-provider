# Auth Testing Implementation Plan

> GitHub Issue: [#4](https://github.com/siraj-samsudeen/feather-testing-convex/issues/4)
> Package repo: `/Users/siraj/Desktop/NonDropBoxProjects/feather-testing-convex`

## Goal

Add `renderWithConvexAuth` to test components using Convex auth hooks without mocking.

## Files

| File | Action |
|------|--------|
| `src/ConvexTestProvider.tsx` | Modify — add `authenticated` prop, `setAuth`/`clearAuth` stubs |
| `src/ConvexTestAuthProvider.tsx` | Create — wraps with `ConvexAuthActionsContext` |
| `src/helpers.tsx` | Modify — add `renderWithConvexAuth` |
| `src/index.ts` | Modify — add new exports |
| `package.json` | Modify — add optional `@convex-dev/auth` peer dep |
| `src/helpers.test.ts` | Modify — add auth rendering tests |
| `README.md` | Modify — add auth testing section |
| `CHANGELOG.md` | Modify — document v0.3.0 |

## Steps

1. Add `authenticated` prop to `ConvexTestProvider` — uses `ConvexProviderWithAuth` when set
2. Create `ConvexTestAuthProvider` — wraps with `ConvexAuthActionsContext`
3. Add `renderWithConvexAuth` to helpers
4. Update exports
5. Update package.json
6. Write tests
7. Update README.md and CHANGELOG.md
8. Verify: `npm run build && npm test`
