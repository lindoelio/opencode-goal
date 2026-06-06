---
name: goal-loop
description: Reusable iterative workflow pattern for goal-driven autonomous execution — plan, act, checkpoint, evaluate, continue
compatibility: opencode
metadata:
  workflow: goal-driven
  pattern: iterate-evaluate-continue
---

# Goal Loop

The **Goal Loop** is an iterative autonomous execution pattern for agents working toward a verifiable completion condition. It powers the `/goal` command workflow.

## Pattern

```
┌─────────────────────────────────────────────────┐
│                    GOAL LOOP                      │
│                                                  │
│   ┌──────────┐     ┌──────────┐                 │
│   │ 1. PLAN  │────▶│ 2. ACT   │                 │
│   └──────────┘     └──────────┘                 │
│         ▲                 │                      │
│         │                 ▼                      │
│         │          ┌──────────────┐              │
│         │          │ 3. CHECKPOINT│              │
│         │          └──────────────┘              │
│         │                 │                      │
│         │                 ▼                      │
│   ┌──────────┐    ┌──────────────┐              │
│   │5. DECIDE │◀───│ 4. EVALUATE  │              │
│   └──────────┘    └──────────────┘              │
│         │                                        │
│    met? │ stop                                   │
│  not?   │ loop                                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Steps

### 1. PLAN
Analyze the goal condition. Identify:
- The verifiable end state
- The verification mechanism (command, file state, output)
- Concrete next actions

### 2. ACT
Execute work directly. Make progress. Use all available tools.

### 3. CHECKPOINT
Bring the project to a verifiable state:
- Run verification commands
- Read relevant files
- Collect evidence of progress

### 4. EVALUATE
Invoke an independent judge (separate model, separate subagent) to evaluate:
- Is the condition met?
- What remains?

The judge must be independent — using the same agent to self-evaluate produces unreliable results.

### 5. DECIDE
- **Met** → Report success, update state, stop
- **Not met + progress** → Loop back to step 1
- **Not met + no progress (3+ iterations)** → Fall back to user
- **Context exhausted** → Save state, fall back to user, allow resume

## When to Use

Use this pattern when:
- The task has a verifiable end state (test pass, build success, file exists)
- The task requires multiple iterations of work
- You want autonomous execution without user re-prompting

## When Not to Use

Skip this pattern when:
- The task is a single straightforward operation
- The end state is subjective or unverifiable
- The user needs to review each step before continuing

## Prerequisites

1. A **goal condition** (user-provided, stored in `.opencode/goal.md`)
2. A **goal-judge subagent** configured with a fast/cheap model
3. A **state file** for persistence (`.opencode/goal.md` with YAML frontmatter)
