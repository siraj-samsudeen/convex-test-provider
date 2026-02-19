# Contributing to feather-testing-convex

## Development Workflow

Every feature or change follows this workflow to ensure full traceability:

```
1. Create GitHub issue        → Get #N
2. Create folder              → docs/N-feature-name/
3. 1_research.md              → Capture exploration & decisions
4. 2_spec.md                  → Define requirements
5. 3_plan.md                  → Implementation steps
6. Execute                    → Write code
7. PR references #N           → Closes issue, all linked
```

---

## Step-by-Step

### 1. Create GitHub Issue

```bash
gh issue create --title "Feature: description" --body "..."
```

This gives you issue number `#N`.

### 2. Create Documentation Folder

```bash
mkdir -p docs/N-feature-name
```

Use the issue number as the folder prefix. This links docs to the issue.

### 3. Write Research Document (`1_research.md`)

Capture:
- **Context** — What problem are we solving?
- **Ecosystems consulted** — URLs, patterns from other frameworks
- **Options considered** — What approaches were evaluated?
- **Decisions made** — What did we choose and why?
- **Key Q&A** — Important questions and answers

Template:
```markdown
# Feature Name Research

> GitHub Issue: [#N](https://github.com/siraj-samsudeen/feather-testing-convex/issues/N)

## Context
[What problem are we solving?]

## Ecosystems Consulted
- [Framework](URL) — Key pattern learned

## Options Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|

## Key Q&A
**Q:** [Question]
**A:** [Answer]

## Final Design
[Summary of chosen approach]
```

### 4. Write Specification (`2_spec.md`)

Define:
- **Requirements** — What must be built
- **Constraints** — What rules must be followed
- **Acceptance criteria** — How do we know it's done

Template:
```markdown
# Feature Name Specification

> GitHub Issue: [#N](https://github.com/siraj-samsudeen/feather-testing-convex/issues/N)

## Overview
[Brief description]

## Requirements
### R1: [Requirement name]
[Details]

## Constraints
### C1: [Constraint name]
[Details]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### 5. Write Implementation Plan (`3_plan.md`)

Define:
- **Files to create/modify**
- **Implementation steps** with code snippets
- **Verification steps**
- **Order of execution**

This plan should be detailed enough for another agent (or human) to execute without additional context.

### 6. Execute

Implement the code following the plan. Run tests to verify.

### 7. Create PR

```bash
git add .
git commit -m "feat(feature-name): description

Implements #N.

Docs: docs/N-feature-name/"

gh pr create --title "feat: description" --body "Closes #N

## Documentation
- [Research](docs/N-feature-name/1_research.md)
- [Spec](docs/N-feature-name/2_spec.md)
- [Plan](docs/N-feature-name/3_plan.md)"
```

---

## Why This Workflow?

1. **Traceability** — Every line of code links back to research and decisions
2. **Onboarding** — New contributors understand *why* code exists, not just *what* it does
3. **AI-friendly** — Agents can read docs to understand context before making changes
4. **Review quality** — Reviewers can check implementation against spec

---

## File Naming

```
docs/
└── N-feature-name/          ← N = GitHub issue number
    ├── 1_research.md        ← First: explore & decide
    ├── 2_spec.md            ← Second: define requirements
    └── 3_plan.md            ← Third: implementation steps
```

Numbers prefix files to show workflow order when listing directory.
