# Claude Code Instructions

This file is auto-read by Claude Code. It provides context for AI agents working on this codebase.

## Workflow

This project follows a structured workflow. See [CONTRIBUTING.md](CONTRIBUTING.md) for full details.

**Summary:**
```
Issue #N → docs/N-feature-name/ → 1_research.md → 2_spec.md → 3_plan.md → Execute → PR
```

## Before Making Changes

1. **Check for existing documentation**
   ```
   ls docs/
   ```
   Look for a folder matching your task (e.g., `docs/1-helper-functions/`)

2. **Read the docs in order**
   - `1_research.md` — Understand decisions already made
   - `2_spec.md` — Understand requirements and constraints
   - `3_plan.md` — Follow the implementation steps

3. **If docs exist, follow the plan** — Don't deviate without good reason

4. **If docs don't exist, create them first** — Research → Spec → Plan → Execute

## Executing a Plan

When executing `3_plan.md`:

1. Read the entire plan first
2. Follow steps in order
3. Run verification steps after each major step
4. If something fails, document why before changing approach

## Making Commits

Reference the GitHub issue in commits:

```bash
git commit -m "feat(feature): description

Implements #N.

Docs: docs/N-feature-name/"
```

## Creating PRs

Link back to documentation:

```bash
gh pr create --title "feat: description" --body "Closes #N

## Documentation
- [Research](docs/N-feature-name/1_research.md)
- [Spec](docs/N-feature-name/2_spec.md)
- [Plan](docs/N-feature-name/3_plan.md)"
```

## Project Structure

```
feather-testing-convex/
├── CLAUDE.md              ← You are here (auto-read by Claude Code)
├── CONTRIBUTING.md        ← Workflow details
├── docs/
│   └── N-feature-name/    ← Feature documentation
│       ├── 1_research.md  ← Why decisions were made
│       ├── 2_spec.md      ← What to build
│       └── 3_plan.md      ← How to build it
├── src/                   ← Source code
└── dist/                  ← Built output
```

## Current Work

| Issue | Folder | Status |
|-------|--------|--------|
| [#1 Helper Functions](https://github.com/siraj-samsudeen/feather-testing-convex/issues/1) | `docs/1-helper-functions/` | Plan ready, awaiting execution |
