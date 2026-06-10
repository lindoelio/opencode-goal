#!/usr/bin/env node

import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { homedir } from "node:os"
import { writeFileSync, existsSync } from "node:fs"
import {
  ensureDir,
  copyDirRecursive,
  readJSONConfig,
  mergeAgentConfig,
  isSameAgentDef,
} from "./lib.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OPENCODE_DIR = join(homedir(), ".config", "opencode")
const CONFIG_FILE = join(OPENCODE_DIR, "opencode.json")

function sortKeys(obj) {
  const sorted = {}
  for (const k of Object.keys(obj).sort()) {
    if (k === "agent" && typeof obj[k] === "object" && obj[k] !== null) {
      sorted[k] = {}
      for (const ak of Object.keys(obj[k]).sort()) {
        sorted[k][ak] = obj[k][ak]
      }
    } else {
      sorted[k] = obj[k]
    }
  }
  return sorted
}

function writeSortedJSON(path, config) {
  const sorted = sortKeys(config)
  if (sorted.$schema === undefined) {
    sorted.$schema = "https://opencode.ai/config.json"
  }
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n")
}

function main() {
  console.log("▸ Installing opencode-goal...")

  ensureDir(OPENCODE_DIR)

  const sourceDir = join(__dirname)
  const destDirs = ["commands", "agents", "skills"]

  for (const dir of destDirs) {
    const src = join(sourceDir, dir)
    const dest = join(OPENCODE_DIR, dir)
    if (existsSync(src)) {
      copyDirRecursive(src, dest)
      console.log(`  ✓ Copied ${dir}/`)
    }
  }

  const goalAgentConfig = {
    "goal-worker": {
      mode: "primary",
      description:
        "Autonomous goal-driven agent that works toward a verifiable completion condition across a judge-evaluated loop",
      permission: {
        question: "deny",
        doom_loop: "deny",
      },
    },
    "goal-judge": {
      mode: "subagent",
      model: "ollama-cloud/deepseek-v4-flash",
      description:
        "Evaluates whether a goal condition has been met. Configure to use your cheapest/fastest available model.",
      permission: {
        question: "deny",
        doom_loop: "deny",
      },
    },
  }

  const existing = readJSONConfig(CONFIG_FILE)
  const existingGoalWorker = existing?.agent?.["goal-worker"]
  const existingGoalJudge = existing?.agent?.["goal-judge"]

  if (
    isSameAgentDef(existingGoalWorker, goalAgentConfig["goal-worker"]) &&
    isSameAgentDef(existingGoalJudge, goalAgentConfig["goal-judge"])
  ) {
    console.log("  ✓ opencode.json already includes goal-worker and goal-judge agents")
  } else {
    const merged = mergeAgentConfig(existing, goalAgentConfig)
    writeSortedJSON(CONFIG_FILE, merged)
    console.log("  ✓ Updated opencode.json with goal-worker and goal-judge agents")
  }

  console.log('▸ opencode-goal installed.')
  console.log('  Run /goal "<condition>" to start, /goal to see status, /goal clear to stop.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main }
