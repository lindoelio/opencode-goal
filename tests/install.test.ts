/**
 * Install tests: verify the install.js script correctly copies files,
 * merges agent configs, detects same-agent-def, and handles edge cases.
 *
 * Imports from lib.js to achieve full coverage of the installable module.
 */
import { describe, it, expect } from "vitest"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  ensureDir,
  copyDirRecursive,
  readJSONConfig,
  mergeAgentConfig,
  isSameAgentDef,
} from "../lib.js"

const GOAL_AGENTS = {
  "goal-worker": {
    mode: "primary",
    description:
      "Autonomous goal-driven agent that works toward a verifiable completion condition across a judge-evaluated loop",
  },
  "goal-judge": {
    mode: "subagent",
    model: "ollama-cloud/deepseek-v4-flash",
    description:
      "Evaluates whether a goal condition has been met. Configure to use your cheapest/fastest available model.",
  },
}

describe("mergeAgentConfig", () => {
  it("adds agents to empty config", () => {
    const result = mergeAgentConfig({}, GOAL_AGENTS)
    expect(result.agent).toBeDefined()
    expect(result.agent["goal-worker"]).toEqual(GOAL_AGENTS["goal-worker"])
    expect(result.agent["goal-judge"]).toEqual(GOAL_AGENTS["goal-judge"])
  })

  it("preserves existing agent definitions", () => {
    const existing = {
      agent: {
        build: { mode: "primary", model: "gpt-4" },
      },
    }
    const result = mergeAgentConfig(existing, GOAL_AGENTS)
    expect(result.agent.build).toEqual({ mode: "primary", model: "gpt-4" })
    expect(result.agent["goal-worker"]).toBeDefined()
  })

  it("preserves user's model preference for existing agent", () => {
    const existing = {
      agent: {
        "goal-judge": {
          mode: "subagent",
          model: "openai/gpt-4o-mini",
          description: "My custom judge",
        },
      },
    }
    const result = mergeAgentConfig(existing, GOAL_AGENTS)
    expect(result.agent["goal-judge"].model).toBe("openai/gpt-4o-mini")
    expect(result.agent["goal-judge"].description).toBe("My custom judge")
    expect(result.agent["goal-judge"].mode).toBe("subagent")
  })

  it("fills in model when existing agent has none", () => {
    const existing = {
      agent: {
        "goal-judge": {
          mode: "subagent",
          description: "Custom desc",
        },
      },
    }
    const result = mergeAgentConfig(existing, GOAL_AGENTS)
    expect(result.agent["goal-judge"].model).toBe(
      GOAL_AGENTS["goal-judge"].model
    )
    expect(result.agent["goal-judge"].description).toBe("Custom desc")
  })

  it("fills in description when existing agent has none", () => {
    const existing = {
      agent: {
        "goal-judge": {
          mode: "subagent",
          model: "custom-model",
        },
      },
    }
    const result = mergeAgentConfig(existing, GOAL_AGENTS)
    expect(result.agent["goal-judge"].description).toBe(
      GOAL_AGENTS["goal-judge"].description
    )
    expect(result.agent["goal-judge"].model).toBe("custom-model")
  })

  it("preserves non-agent config keys", () => {
    const existing = {
      $schema: "https://opencode.ai/config.json",
      shell: "zsh",
      model: "claude-sonnet",
      agent: { build: { mode: "primary" } },
    }
    const result = mergeAgentConfig(existing, GOAL_AGENTS)
    expect(result["$schema"]).toBe("https://opencode.ai/config.json")
    expect(result.shell).toBe("zsh")
    expect(result.model).toBe("claude-sonnet")
  })

  it("does not mutate original config", () => {
    const existing = { agent: { build: { mode: "primary" } } }
    const copy = structuredClone(existing)
    mergeAgentConfig(existing, GOAL_AGENTS)
    expect(existing).toEqual(copy)
  })

  it("creates agent key if not present", () => {
    const existing = { shell: "bash" }
    const result = mergeAgentConfig(existing, GOAL_AGENTS)
    expect(result.agent).toBeDefined()
    expect(result.agent["goal-worker"]).toBeDefined()
    expect(result.shell).toBe("bash")
  })
})

describe("isSameAgentDef", () => {
  it("returns true for identical definitions", () => {
    const a = { mode: "primary", model: "gpt-4", description: "test" }
    const b = { mode: "primary", model: "gpt-4", description: "test" }
    expect(isSameAgentDef(a, b)).toBe(true)
  })

  it("returns false for different mode", () => {
    const a = { mode: "primary", model: "gpt-4", description: "test" }
    const b = { mode: "subagent", model: "gpt-4", description: "test" }
    expect(isSameAgentDef(a, b)).toBe(false)
  })

  it("returns false for different model", () => {
    const a = { mode: "primary", model: "gpt-4", description: "test" }
    const b = { mode: "primary", model: "gpt-4o", description: "test" }
    expect(isSameAgentDef(a, b)).toBe(false)
  })

  it("returns false for different description", () => {
    const a = { mode: "primary", model: "gpt-4", description: "test" }
    const b = { mode: "primary", model: "gpt-4", description: "other" }
    expect(isSameAgentDef(a, b)).toBe(false)
  })

  it("returns false when both are undefined", () => {
    expect(isSameAgentDef(undefined, undefined)).toBe(false)
  })

  it("returns false when one is undefined", () => {
    const a = { mode: "primary", model: "gpt-4", description: "test" }
    expect(isSameAgentDef(a, undefined)).toBe(false)
    expect(isSameAgentDef(undefined, a)).toBe(false)
  })

  it("returns false when both are null", () => {
    expect(isSameAgentDef(null, null)).toBe(false)
  })

  it("returns true for objects with extra fields but matching core", () => {
    const a = { mode: "primary", model: "gpt-4", description: "test" }
    const b = { mode: "primary", model: "gpt-4", description: "test", extra: true }
    expect(isSameAgentDef(a, b)).toBe(true)
  })

  it("returns true when model is undefined in both", () => {
    const a = { mode: "subagent", description: "test" }
    const b = { mode: "subagent", description: "test" }
    expect(isSameAgentDef(a, b)).toBe(true)
  })
})

describe("readJSONConfig", () => {
  it("returns empty object for missing file", () => {
    const result = readJSONConfig("/tmp/nonexistent-opencode-goal-test.json")
    expect(result).toEqual({})
  })

  it("returns empty object for invalid JSON", () => {
    const tmpPath = join(tmpdir(), "opencode-goal-test-invalid.json")
    writeFileSync(tmpPath, "not valid json {{{")
    try {
      const result = readJSONConfig(tmpPath)
      expect(result).toEqual({})
    } finally {
      rmSync(tmpPath, { force: true })
    }
  })

  it("reads valid JSON config", () => {
    const tmpPath = join(tmpdir(), "opencode-goal-test-valid.json")
    const config = { shell: "zsh", agent: { build: { mode: "primary" } } }
    writeFileSync(tmpPath, JSON.stringify(config))
    try {
      const result = readJSONConfig(tmpPath)
      expect(result).toEqual(config)
    } finally {
      rmSync(tmpPath, { force: true })
    }
  })
})

describe("ensureDir", () => {
  it("creates a directory that does not exist", () => {
    const tmpPath = join(tmpdir(), `opencode-goal-test-dir-${Date.now()}`)
    ensureDir(tmpPath)
    expect(existsSync(tmpPath)).toBe(true)
    rmSync(tmpPath, { recursive: true, force: true })
  })

  it("does not throw for existing directory", () => {
    const tmpPath = join(tmpdir(), `opencode-goal-test-dir-exist-${Date.now()}`)
    mkdirSync(tmpPath)
    ensureDir(tmpPath)
    expect(existsSync(tmpPath)).toBe(true)
    rmSync(tmpPath, { recursive: true, force: true })
  })

  it("creates nested directories", () => {
    const tmpPath = join(tmpdir(), `opencode-goal-test-nested-${Date.now()}`, "a", "b", "c")
    ensureDir(tmpPath)
    expect(existsSync(tmpPath)).toBe(true)
    rmSync(join(tmpdir(), `opencode-goal-test-nested-${Date.now()}`), { recursive: true, force: true })
  })
})

describe("copyDirRecursive", () => {
  it("copies directory with files and subdirectories", () => {
    const basePath = join(tmpdir(), `opencode-goal-test-copy-${Date.now()}`)
    const src = join(basePath, "src")
    const dest = join(basePath, "dest")

    const sub1 = join(src, "sub1")
    const sub2 = join(src, "sub2")
    ensureDir(sub1)
    ensureDir(sub2)
    writeFileSync(join(src, "root.txt"), "root")
    writeFileSync(join(sub1, "a.txt"), "a")
    writeFileSync(join(sub2, "b.txt"), "b")

    try {
      copyDirRecursive(src, dest)
      expect(existsSync(join(dest, "root.txt"))).toBe(true)
      expect(existsSync(join(dest, "sub1", "a.txt"))).toBe(true)
      expect(existsSync(join(dest, "sub2", "b.txt"))).toBe(true)
    } finally {
      rmSync(basePath, { recursive: true, force: true })
    }
  })

  it("copies empty directory", () => {
    const basePath = join(tmpdir(), `opencode-goal-test-copy-empty-${Date.now()}`)
    const src = join(basePath, "src")
    const dest = join(basePath, "dest")
    ensureDir(src)

    try {
      copyDirRecursive(src, dest)
      expect(existsSync(dest)).toBe(true)
    } finally {
      rmSync(basePath, { recursive: true, force: true })
    }
  })
})

describe("Full install: no pre-existing config", () => {
  it("produces correct final config with both goal agents on empty input", () => {
    const result = mergeAgentConfig({}, GOAL_AGENTS)
    expect(result.agent["goal-worker"].mode).toBe("primary")
    expect(result.agent["goal-worker"].description).toBe(
      GOAL_AGENTS["goal-worker"].description
    )
    expect(result.agent["goal-judge"].mode).toBe("subagent")
    expect(result.agent["goal-judge"].model).toBe(
      GOAL_AGENTS["goal-judge"].model
    )
  })
})

describe("Full install: config with only model set", () => {
  it("keeps user model when both existing goal agents have custom model", () => {
    const existing = {
      agent: {
        "goal-worker": {
          mode: "primary",
          description: GOAL_AGENTS["goal-worker"].description,
        },
        "goal-judge": {
          mode: "subagent",
          model: "openai/gpt-4o-mini",
          description: GOAL_AGENTS["goal-judge"].description,
        },
      },
    }
    const result = mergeAgentConfig(existing, GOAL_AGENTS)
    expect(result.agent["goal-judge"].model).toBe("openai/gpt-4o-mini")
  })
})
