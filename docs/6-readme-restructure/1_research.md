# README Restructure Research

> GitHub Issue: README restructure for clarity

## Context

When landing on the repo, the key idea of the project is not clear. The current README drills into too many details (philosophy essay, MECE principle, etc.) before showing what the library does. The value prop needs to be immediately visible.

## Key Findings

### Problem
- Current README leads with ~100 lines of philosophy before showing a concrete example
- The "aha moment" (one integration test replaces two isolated tests) is buried
- Reader has to understand the abstract framing before seeing practical value

### What works
- The before/after code examples are good content — just poorly positioned
- The comparison table approach (Option C) gives instant visual clarity
- Following with a narrative (Option B) grounds the table in a concrete scenario

## Decision

Restructure the README to:
1. Lead with a comparison table showing the testing landscape
2. Follow with a brief narrative grounding each row of the table in a real scenario (`<TodoList>` example)
3. Name the gap, then show the 4-line solution
4. Push detailed features, philosophy, and reference material below the fold
