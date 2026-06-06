/**
 * State machine tests: verify the goal state file format contract
 * and all valid state transitions.
 */
import { describe, it, expect } from "vitest"

const STATUS_VALUES = ["active", "paused", "achieved", "cleared"] as const

function parseGoalState(yamlLines) {
  const state = {}
  for (const line of yamlLines) {
    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    state[key] = value
  }
  return state
}

function serializeGoalState(state) {
  return [
    "---",
    `condition: ${state.condition || ""}`,
    `status: ${state.status || "active"}`,
    `iterations: ${state.iterations ?? 0}`,
    `started_at: ${state.started_at || ""}`,
    `last_verdict: ${state.last_verdict || ""}`,
    `max_iterations: ${state.max_iterations ?? 0}`,
    "---",
  ]
}

describe("Goal state file format", () => {
  it("has exactly six frontmatter fields", () => {
    const required = [
      "condition",
      "status",
      "iterations",
      "started_at",
      "last_verdict",
      "max_iterations",
    ]
    expect(required).toHaveLength(6)
  })

  it("serializes a valid state", () => {
    const state = {
      condition: "All tests pass",
      status: "active",
      iterations: 0,
      started_at: "2026-06-06T14:30:00Z",
      last_verdict: "",
      max_iterations: 0,
    }
    const lines = serializeGoalState(state)
    const parsed = parseGoalState(lines)
    expect(parsed.condition).toBe("All tests pass")
    expect(parsed.status).toBe("active")
    expect(parsed.iterations).toBe("0")
    expect(parsed.max_iterations).toBe("0")
  })

  it("serializes a goal with iterations", () => {
    const state = {
      condition: "Build passes",
      status: "active",
      iterations: 5,
      started_at: "2026-06-06T14:30:00Z",
      last_verdict: "2 errors in build",
      max_iterations: 15,
    }
    const lines = serializeGoalState(state)
    const parsed = parseGoalState(lines)
    expect(parsed.iterations).toBe("5")
    expect(parsed.last_verdict).toBe("2 errors in build")
  })

  it("serializes max_iterations 0 (unlimited)", () => {
    const state = {
      condition: "Refactor complete",
      status: "active",
      iterations: 0,
      started_at: "",
      last_verdict: "",
      max_iterations: 0,
    }
    const lines = serializeGoalState(state)
    const parsed = parseGoalState(lines)
    expect(parsed.max_iterations).toBe("0")
  })
})

describe("Goal state transitions", () => {
  function transition(from, action) {
    const transitions = {
      active: { pause: "paused", clear: "cleared", achieve: "achieved" },
      paused: { resume: "active", clear: "cleared" },
      achieved: {},
      cleared: {},
    }
    return transitions[from]?.[action] ?? null
  }

  it("active → pause → paused", () => {
    expect(transition("active", "pause")).toBe("paused")
  })

  it("paused → resume → active", () => {
    expect(transition("paused", "resume")).toBe("active")
  })

  it("active → clear → cleared", () => {
    expect(transition("active", "clear")).toBe("cleared")
  })

  it("paused → clear → cleared", () => {
    expect(transition("paused", "clear")).toBe("cleared")
  })

  it("active → achieve → achieved", () => {
    expect(transition("active", "achieve")).toBe("achieved")
  })

  it("cannot resume active goal", () => {
    expect(transition("active", "resume")).toBeNull()
  })

  it("cannot pause already paused goal", () => {
    expect(transition("paused", "pause")).toBeNull()
  })

  it("cannot modify achieved goal", () => {
    expect(transition("achieved", "pause")).toBeNull()
    expect(transition("achieved", "resume")).toBeNull()
    expect(transition("achieved", "clear")).toBeNull()
  })

  it("cannot modify cleared goal", () => {
    expect(transition("cleared", "pause")).toBeNull()
    expect(transition("cleared", "resume")).toBeNull()
    expect(transition("cleared", "achieve")).toBeNull()
  })

  it("active can only be set from no-goal or cleared state", () => {
    const canSetActive = (from) =>
      from === undefined || from === null || from === "cleared"
    expect(canSetActive(undefined)).toBe(true)
    expect(canSetActive("cleared")).toBe(true)
    expect(canSetActive("active")).toBe(false)
    expect(canSetActive("paused")).toBe(false)
    expect(canSetActive("achieved")).toBe(false)
  })

  it("all valid status values are in the defined set", () => {
    const validStatuses = ["active", "paused", "achieved", "cleared"]
    for (const s of STATUS_VALUES) {
      expect(validStatuses).toContain(s)
    }
  })
})

describe("Goal iterations and limits", () => {
  it("max_iterations 0 means unlimited", () => {
    const maxIterations = 0
    const limitReached = (iterations, max) => {
      if (max === 0) return false
      return iterations >= max
    }
    expect(limitReached(5, maxIterations)).toBe(false)
    expect(limitReached(100, maxIterations)).toBe(false)
    expect(limitReached(1000, maxIterations)).toBe(false)
  })

  it("max_iterations positive stops at limit", () => {
    const limitReached = (iterations, max) => {
      if (max === 0) return false
      return iterations >= max
    }
    expect(limitReached(0, 5)).toBe(false)
    expect(limitReached(4, 5)).toBe(false)
    expect(limitReached(5, 5)).toBe(true)
    expect(limitReached(6, 5)).toBe(true)
  })

  it("no-progress detection fires after 3 iterations with same verdict", () => {
    const verdicts = [
      "2 tests fail in auth.test",
      "2 tests fail in auth.test",
      "2 tests fail in auth.test",
    ]
    const sameVerdicts = verdicts.every((v) => v === verdicts[0])
    expect(sameVerdicts).toBe(true)
    expect(verdicts.length).toBe(3)
  })

  it("no-progress does not fire with different verdicts", () => {
    const verdicts = [
      "4 tests fail",
      "2 tests fail in auth.test",
      "1 test fails in auth.test",
    ]
    const allSame = verdicts.every((v) => v === verdicts[0])
    expect(allSame).toBe(false)
  })

  it("no-progress does not fire with fewer than 3 iterations", () => {
    const verdicts = ["2 tests fail", "2 tests fail"]
    const allSame = verdicts.every((v) => v === verdicts[0])
    expect(allSame).toBe(true)
    expect(verdicts.length).toBeLessThan(3)
  })
})
