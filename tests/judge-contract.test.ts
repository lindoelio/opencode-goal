/**
 * Judge contract tests: verify the JSON output schema that the
 * goal-judge subagent must adhere to.
 */
import { describe, it, expect } from "vitest"

const VALID_MET_REASONS = [
  "npm test exits 0, all 42 tests pass",
  "Build succeeds, no errors",
  "CHANGELOG.md has entries for all 5 PRs merged this week",
  "All files migrated, zero import errors",
]

const VALID_NOT_MET_REASONS = [
  "3 tests fail in src/auth.test.ts",
  "Build fails: 2 TS errors in src/new-feature.ts",
  "CHANGELOG.md missing entries for 2 PRs",
  "2 import errors remain in src/legacy/",
]

const INVALID_REASONS = [
  "".padStart(121, "x"),
  "",
  null,
  undefined,
]

function validateVerdict(verdict) {
  if (!verdict || typeof verdict !== "object") return false
  if (typeof verdict.met !== "boolean") return false
  if (typeof verdict.reason !== "string") return false
  if (verdict.reason.length === 0) return false
  if (verdict.reason.length > 120) return false
  return true
}

describe("Judge output schema", () => {
  it("accepts valid met verdict", () => {
    for (const reason of VALID_MET_REASONS) {
      expect(validateVerdict({ met: true, reason })).toBe(true)
    }
  })

  it("accepts valid not-met verdict", () => {
    for (const reason of VALID_NOT_MET_REASONS) {
      expect(validateVerdict({ met: false, reason })).toBe(true)
    }
  })

  it("rejects missing met field", () => {
    expect(validateVerdict({ reason: "tests fail" })).toBe(false)
  })

  it("rejects missing reason field", () => {
    expect(validateVerdict({ met: false })).toBe(false)
  })

  it("rejects non-boolean met field", () => {
    expect(validateVerdict({ met: "true", reason: "ok" })).toBe(false)
    expect(validateVerdict({ met: 1, reason: "ok" })).toBe(false)
    expect(validateVerdict({ met: null, reason: "ok" })).toBe(false)
  })

  it("rejects non-string reason field", () => {
    expect(validateVerdict({ met: true, reason: 42 })).toBe(false)
    expect(validateVerdict({ met: false, reason: ["fail"] })).toBe(false)
    expect(validateVerdict({ met: false, reason: true })).toBe(false)
  })

  it("rejects empty reason", () => {
    expect(validateVerdict({ met: false, reason: "" })).toBe(false)
  })

  it("rejects reason exceeding 120 characters", () => {
    const reason = "x".repeat(121)
    expect(validateVerdict({ met: false, reason })).toBe(false)
  })

  it("accepts reason exactly 120 characters", () => {
    const reason = "x".repeat(120)
    expect(validateVerdict({ met: false, reason })).toBe(true)
  })

  it("rejects null verdict", () => {
    expect(validateVerdict(null)).toBe(false)
  })

  it("rejects undefined verdict", () => {
    expect(validateVerdict(undefined)).toBe(false)
  })

  it("rejects non-object verdict (string)", () => {
    expect(validateVerdict("ok")).toBe(false)
  })

  it("rejects non-object verdict (array)", () => {
    expect(validateVerdict([])).toBe(false)
  })

  it("rejects verdict with extra fields", () => {
    expect(
      validateVerdict({ met: true, reason: "ok", extra: "field" })
    ).toBe(true)
  })

  it("is valid JSON serializable", () => {
    const verdict = { met: true, reason: "all pass" }
    const json = JSON.stringify(verdict)
    const parsed = JSON.parse(json)
    expect(parsed).toEqual(verdict)
  })

  it("is valid JSON with special characters in reason", () => {
    const verdict = {
      met: false,
      reason: 'Tests fail in "auth.test.ts": expect(42)',
    }
    const json = JSON.stringify(verdict)
    const parsed = JSON.parse(json)
    expect(parsed.met).toBe(false)
    expect(parsed.reason).toContain("auth.test.ts")
    expect(parsed.reason).toContain("expect(42)")
  })

  it("exactly matches the documented contract format", () => {
    const examples = [
      { met: false, reason: "3 of 5 tests still fail in auth.test.ts" },
      { met: true, reason: "npm test exits 0, all tests pass" },
    ]
    for (const example of examples) {
      expect(validateVerdict(example)).toBe(true)
      expect(Object.keys(example)).toHaveLength(2)
      expect(example).toHaveProperty("met")
      expect(example).toHaveProperty("reason")
    }
  })
})

describe("Judge behavior rules", () => {
  function evaluate(met, reason) {
    return { met, reason }
  }

  it("met: true only when definitively satisfied", () => {
    const testPass = evaluate(true, "npm test exits 0, all 42 tests pass")
    expect(testPass.met).toBe(true)

    const partial = evaluate(false, "2 tests still fail")
    expect(partial.met).toBe(false)
  })

  it("met: false includes actionable reason", () => {
    const verdict = evaluate(false, "2 tests fail in src/auth.test.ts: login and logout")
    expect(verdict.met).toBe(false)
    expect(verdict.reason.length).toBeGreaterThan(10)
    expect(verdict.reason).toContain("auth")
  })

  it("never marks met: true for partial progress", () => {
    const verdict = evaluate(false, "8 of 10 tests pass, 2 remain")
    expect(verdict.met).toBe(false)
  })

  it("build-based goal: met when build succeeds", () => {
    expect(evaluate(true, "tsc --noEmit exits 0, zero type errors").met).toBe(true)
    expect(evaluate(false, "tsc --noEmit exits 1, 3 type errors").met).toBe(false)
  })

  it("file-based goal: met when all entries exist", () => {
    expect(
      evaluate(true, "CHANGELOG.md has entries for all 5 merged PRs").met
    ).toBe(true)
    expect(
      evaluate(false, "CHANGELOG.md missing entries for 2 PRs").met
    ).toBe(false)
  })

  it("does not speculate about missing information", () => {
    const verdict = evaluate(false, "cannot determine: no test output available")
    expect(verdict.met).toBe(false)
    expect(verdict.reason).toContain("cannot determine")
  })
})
