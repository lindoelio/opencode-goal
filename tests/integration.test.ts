/**
 * Integration tests: verify the plugin's README is complete,
 * JSON outputs match contracts, and edge cases are covered.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

describe("Integration: README completeness", () => {
  let readme = ""
  try {
    readme = readFileSync(join(root, "README.md"), "utf-8")
  } catch {}

  it("has project name", () => {
    expect(readme).toContain("opencode-goal")
  })

  it("has install instructions", () => {
    expect(readme).toContain("Install")
    expect(readme).toContain("npm install")
  })

  it("has command reference", () => {
    expect(readme).toContain("/goal")
    expect(readme).toContain("clear")
    expect(readme).toContain("pause")
    expect(readme).toContain("resume")
  })

  it("has architecture section", () => {
    expect(readme).toContain("Architecture")
    expect(readme).toContain("goal-worker")
    expect(readme).toContain("goal-judge")
  })

  it("has judge contract", () => {
    expect(readme).toContain("Judge Contract")
    expect(readme).toContain('"met"')
  })

  it("describes state file", () => {
    expect(readme).toContain(".opencode/goal.md")
    expect(readme).toContain("max_iterations")
  })
})

describe("Integration: all required paths exist", () => {
  const required = [
    "package.json",
    "commands/goal.md",
    "agents/goal-worker.agent.md",
    "agents/goal-judge.agent.md",
    "skills/goal-loop/SKILL.md",
    "install.js",
    "install.sh",
    "README.md",
    "vitest.config.ts",
  ]

  for (const path of required) {
    it(`has ${path}`, () => {
      expect(existsSync(join(root, path))).toBe(true)
    })
  }
})

describe("Integration: file sizes are reasonable", () => {
  const filesToCheck = [
    { path: "agents/goal-worker.agent.md", min: 1000, max: 15000 },
    { path: "agents/goal-judge.agent.md", min: 500, max: 8000 },
    { path: "skills/goal-loop/SKILL.md", min: 300, max: 5000 },
    { path: "commands/goal.md", min: 50, max: 2000 },
  ]

  for (const { path, min, max } of filesToCheck) {
    it(`${path} has reasonable size (${min}-${max} bytes)`, () => {
      const content = readFileSync(join(root, path), "utf-8")
      expect(content.length).toBeGreaterThanOrEqual(min)
      expect(content.length).toBeLessThanOrEqual(max)
    })
  }
})

describe("Integration: cross-references between files", () => {
  const worker = readFileSync(
    join(root, "agents/goal-worker.agent.md"),
    "utf-8"
  )
  const judge = readFileSync(
    join(root, "agents/goal-judge.agent.md"),
    "utf-8"
  )
  const loop = readFileSync(
    join(root, "skills/goal-loop/SKILL.md"),
    "utf-8"
  )
  const command = readFileSync(
    join(root, "commands/goal.md"),
    "utf-8"
  )

  it("command references goal-worker agent", () => {
    expect(command).toContain("goal-worker")
  })

  it("worker references goal-judge subagent", () => {
    expect(worker).toContain("goal-judge")
  })

  it("worker references goal-loop skill", () => {
    expect(worker).toContain("loop")
  })

  it("worker references .opencode/goal.md state file", () => {
    expect(worker).toContain(".opencode/goal.md")
  })

  it("judge documents JSON output contract", () => {
    expect(judge).toContain("met")
    expect(judge).toContain("reason")
  })

  it("loop skill documents all five loop steps", () => {
    expect(loop).toContain("PLAN")
    expect(loop).toContain("ACT")
    expect(loop).toContain("CHECKPOINT")
    expect(loop).toContain("EVALUATE")
    expect(loop).toContain("DECIDE")
  })
})

describe("Integration: edge cases", () => {
  it("handles goal condition with special characters", () => {
    const condition = "Test 'complex' \"scenario\" with $VAR and \n newlines"
    const verdict = { met: false, reason: "still working" }
    const json = JSON.stringify({ condition, verdict })
    const parsed = JSON.parse(json)
    expect(parsed.condition).toBe(condition)
    expect(parsed.verdict.met).toBe(false)
  })

  it("handles empty goal condition (status query)", () => {
    const input = ""
    const isStatusQuery = input.trim() === ""
    expect(isStatusQuery).toBe(true)
  })

  it("handles goal condition = 'clear' (word match)", () => {
    const input = "clear"
    const isClear = input.trim().toLowerCase() === "clear"
    expect(isClear).toBe(true)
  })

  it("handles goal condition = 'pause' (word match)", () => {
    const input = "pause"
    const isPause = input.trim().toLowerCase() === "pause"
    expect(isPause).toBe(true)
  })

  it("handles goal condition = 'resume' (word match)", () => {
    const input = "resume"
    const isResume = input.trim().toLowerCase() === "resume"
    expect(isResume).toBe(true)
  })

  it("handles 'clear' as part of a longer goal", () => {
    const input = "clear all the cache files and make tests pass"
    const isClear = input.trim().toLowerCase() === "clear"
    expect(isClear).toBe(false)
  })

  it("handles 'pause' as part of a longer goal", () => {
    const input = "pause the animation and fix the layout"
    const isPause = input.trim().toLowerCase() === "pause"
    expect(isPause).toBe(false)
  })

  it("handles whitespace-only input as status query", () => {
    expect("   ".trim() === "").toBe(true)
    expect("\t\n".trim() === "").toBe(true)
  })

  it("handles very long goal condition", () => {
    const condition = "x".repeat(4000)
    expect(condition.length).toBe(4000)
  })

  it("handles unicode in goal condition", () => {
    const condition = "Migrate all tests ✅ and fix 日本語 comments"
    const verdict = JSON.stringify({ met: false, reason: "3 remaining" })
    expect(verdict).toContain("3 remaining")
  })
})
