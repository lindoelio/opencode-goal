# opencode-goal-worker

Session-scoped `/goal` command for [OpenCode](https://opencode.ai) with an autonomous execution loop and configurable judge model.

```
npm install -g opencode-goal-worker
opencode-goal
```

```
/goal "All tests pass with npm test"
◎ Goal set · "All tests pass with npm test"
○ Turn 1 · 3 tests still failing
○ Turn 2 · 1 test still failing
✓ Goal achieved · 3 turns · 22s
```

Built to match Claude Code's `/goal` primitive — set a verifiable completion condition and let the agent iterate autonomously until it's met.

## Architecture

```
/goal "condition"
    │
    ▼
┌─────────────┐     ┌──────────────┐
│ goal-worker  │────▶│  goal-judge  │
│  (primary)   │◀────│  (subagent)  │
└─────────────┘     └──────────────┘
    │                      │
    │  work → checkpoint   │  evaluate
    │  ← judge verdict     │  return {met, reason}
    │                      │
    ▼                      ▼
┌─────────────────────────────────┐
│  .opencode/goal.md (state file) │
│  YAML frontmatter persistence   │
└─────────────────────────────────┘
```

| Component | Type | Description |
|---|---|---|
| `goal.md` | Command | Entry point, delegates to goal-worker |
| `goal-worker` | Primary agent | Autonomous work loop: plan → act → checkpoint → evaluate |
| `goal-judge` | Subagent | Independent evaluator using a fast/cheap model |
| `goal-loop` | Skill | Reusable iterative pattern documentation |

## Commands

| Command | Action |
|---|---|
| `/goal "condition"` | Set a new goal and start autonomous work |
| `/goal` | Display current goal status, turns, last verdict |
| `/goal clear` | Abandon current goal |
| `/goal pause` | Suspend goal without clearing |
| `/goal resume` | Resume a paused goal |

## Installation

### From npm

```bash
npm install -g opencode-goal-worker
opencode-goal
```

### From source

```bash
git clone https://github.com/lindoelio/opencode-goal-worker
npm install
npm test
```

### Manual

```bash
cp -r {commands,agents,skills} ~/.config/opencode/
node install.js            # auto-configures opencode.json agents
```

## Configuration

The installer adds `goal-worker` and `goal-judge` agents to your `~/.config/opencode/opencode.json`. Customize the judge model to use your cheapest/fastest available model:

```json
{
  "agent": {
    "goal-judge": {
      "mode": "subagent",
      "model": "openai/gpt-4o-mini",
      "description": "Evaluates whether a goal condition has been met"
    }
  }
}
```

The judge model is entirely configurable — use whatever fast/cheap model you have access to.

The installer also sets safe defaults for agent permissions:

| Tool | Setting | Reason |
|---|---|---|
| `question` | `deny` | Prevents mid-loop "should I continue?" prompts |
| `doom_loop` | `deny` | Prevents the system from interrupting iterative work as stuck |

You can override these in your config if you need interactive clarification during the work loop.

## State File

Goals persist in `.opencode/goal.md`:

```markdown
---
condition: All tests pass with npm test
status: active
iterations: 3
started_at: '2026-06-06T14:30:00Z'
last_verdict: 2 tests fail in src/auth.test.ts
max_iterations: 0
---
```

- `max_iterations: 0` = unlimited (stops only when met or user clears)
- `max_iterations: N` = stops after N iterations, falls back to user

## Judge Contract

The goal-judge subagent returns structured JSON:

```json
{"met": false, "reason": "3 of 5 tests still fail in auth.test.ts"}
```

```json
{"met": true, "reason": "npm test exits 0, all tests pass"}
```

The worker uses the `reason` field of `met: false` verdicts to guide the next iteration.
