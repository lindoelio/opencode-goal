/**
 * Structural tests: verify all plugin files exist with correct frontmatter,
 * required sections, and proper YAML formatting.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

function readFile(path) {
  return readFileSync(join(root, path), "utf-8")
}

function parseFrontmatter(content) {
  const lines = content.split("\n")
  if (!lines[0] || lines[0].trim() !== "---") return null

  let endIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i
      break
    }
  }
  if (endIdx === -1) return null

  const fm = {}
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i]
    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue
    fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
  }
  return fm
}

function getBodyAfterFrontmatter(content) {
  const lines = content.split("\n")
  let endIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i
      break
    }
  }
  return lines.slice(endIdx + 1).join("\n").trim()
}

describe("Plugin structure", () => {
  it("has commands directory", () => {
    expect(existsSync(join(root, "commands"))).toBe(true)
  })

  it("has agents directory", () => {
    expect(existsSync(join(root, "agents"))).toBe(true)
  })

  it("has skills directory", () => {
    expect(existsSync(join(root, "skills"))).toBe(true)
  })

  it("has install.js", () => {
    expect(existsSync(join(root, "install.js"))).toBe(true)
  })

  it("has install.sh", () => {
    expect(existsSync(join(root, "install.sh"))).toBe(true)
  })

  it("has README.md", () => {
    expect(existsSync(join(root, "README.md"))).toBe(true)
  })

  it("has package.json with correct name", () => {
    const pkg = JSON.parse(readFile("package.json"))
    expect(pkg.name).toBe("opencode-goal")
    expect(pkg.version).toBeTruthy()
    expect(pkg.license).toBe("MIT")
  })
})

describe("goal.md command", () => {
  const content = readFile("commands/goal.md")
  const fm = parseFrontmatter(content)

  it("has valid YAML frontmatter", () => {
    expect(fm).not.toBeNull()
  })

  it("has name: goal", () => {
    expect(fm.name).toBe("goal")
  })

  it("has description", () => {
    expect(fm.description).toBeTruthy()
    expect(fm.description.length).toBeGreaterThan(10)
  })

  it("is mode: primary", () => {
    expect(fm.mode).toBe("primary")
  })

  it("is agent: goal-worker", () => {
    expect(fm.agent).toBe("goal-worker")
  })

  it("delegates to worker via {{args}}", () => {
    const body = getBodyAfterFrontmatter(content)
    expect(body).toContain("{{args}}")
  })
})

describe("goal-worker.agent.md", () => {
  const content = readFile("agents/goal-worker.agent.md")
  const fm = parseFrontmatter(content)
  const body = getBodyAfterFrontmatter(content)

  it("has valid YAML frontmatter", () => {
    expect(fm).not.toBeNull()
  })

  it("has name: goal-worker", () => {
    expect(fm.name).toBe("goal-worker")
  })

  it("is mode: primary", () => {
    expect(fm.mode).toBe("primary")
  })

  it("describes state file format", () => {
    expect(body).toContain(".opencode/goal.md")
    expect(body).toContain("condition:")
    expect(body).toContain("status: active")
    expect(body).toContain("iterations:")
    expect(body).toContain("started_at:")
    expect(body).toContain("last_verdict:")
    expect(body).toContain("max_iterations:")
  })

  it("describes all five intents", () => {
    expect(body).toContain("STATUS")
    expect(body).toContain("CLEAR")
    expect(body).toContain("PAUSE")
    expect(body).toContain("RESUME")
    expect(body).toContain("SET")
  })

  it("describes work loop with all five steps", () => {
    expect(body).toContain("Plan")
    expect(body).toContain("Act")
    expect(body).toContain("Checkpoint")
    expect(body).toContain("Evaluate")
    expect(body).toContain("Continue")
  })

  it("mentions goal-judge subagent", () => {
    expect(body).toContain("goal-judge")
  })

  it("includes max_iterations 0 = unlimited", () => {
    expect(body).toContain("max_iterations: 0")
    expect(body).toContain("unlimited iterations")
  })

  it("includes no-progress detection (3+ iterations)", () => {
    expect(body).toContain("No progress detected")
    expect(body).toContain("unchanged")
  })

  it("includes context management", () => {
    expect(body).toContain("Context Management")
    expect(body).toContain("critically low")
  })
})

describe("goal-judge.agent.md", () => {
  const content = readFile("agents/goal-judge.agent.md")
  const fm = parseFrontmatter(content)
  const body = getBodyAfterFrontmatter(content)

  it("has valid YAML frontmatter", () => {
    expect(fm).not.toBeNull()
  })

  it("has name: goal-judge", () => {
    expect(fm.name).toBe("goal-judge")
  })

  it("is mode: subagent", () => {
    expect(fm.mode).toBe("subagent")
  })

  it("specifies JSON output schema", () => {
    expect(body).toContain('"met"')
    expect(body).toContain('"reason"')
    expect(body).toContain("valid JSON")
    expect(body).toContain("boolean")
    expect(body).toContain("string")
  })

  it("describes met: true only when definitively satisfied", () => {
    expect(body).toContain("definitively")
  })

  it("describes met: false for all other cases", () => {
    expect(body).toContain("max 120 characters")
  })

  it("includes verdict contract table", () => {
    expect(body).toContain("Verdict Contract")
  })

  it("includes examples for met and not met", () => {
    expect(body).toContain("Example")
    expect(body).toContain("npm test")
  })

  it("explicitly says only JSON output", () => {
    expect(body).toContain("Return **ONLY** valid JSON")
  })
})

describe("goal-loop/SKILL.md", () => {
  const content = readFile("skills/goal-loop/SKILL.md")
  const fm = parseFrontmatter(content)
  const body = getBodyAfterFrontmatter(content)

  it("has valid YAML frontmatter", () => {
    expect(fm).not.toBeNull()
  })

  it("has name: goal-loop", () => {
    expect(fm.name).toBe("goal-loop")
  })

  it("has description", () => {
    expect(fm.description).toBeTruthy()
  })

  it("has compatibility field", () => {
    expect(fm.compatibility).toBeTruthy()
  })

  it("describes all five loop steps", () => {
    expect(body).toContain("PLAN")
    expect(body).toContain("ACT")
    expect(body).toContain("CHECKPOINT")
    expect(body).toContain("EVALUATE")
    expect(body).toContain("DECIDE")
  })

  it("has decision criteria for met/not-met/progress/no-progress", () => {
    expect(body).toContain("Met")
    expect(body).toContain("Not met")
    expect(body).toContain("no progress")
  })
})
