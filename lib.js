import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
} from "node:fs"
import { join, dirname } from "node:path"

export function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function copyDirRecursive(src, dest) {
  ensureDir(dest)
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      ensureDir(dirname(destPath))
      copyFileSync(srcPath, destPath)
    }
  }
}

function stripJsonComments(raw) {
  let out = ""
  let inString = false
  let inLineComment = false
  let inBlockComment = false
  let escape = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const next = raw[i + 1]

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false
        out += ch
      }
      continue
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false
        i++
      }
      continue
    }
    if (escape) {
      escape = false
      out += ch
      continue
    }
    if (ch === "\\") {
      escape = true
      out += ch
      continue
    }
    if (ch === '"') {
      inString = !inString
      out += ch
      continue
    }
    if (!inString && ch === "/" && next === "/") {
      inLineComment = true
      i++
      continue
    }
    if (!inString && ch === "/" && next === "*") {
      inBlockComment = true
      i++
      continue
    }
    out += ch
  }
  // strip trailing commas before ] or }
  return out.replace(/,\s*([}\]])/g, "$1")
}

export function readJSONConfig(path) {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, "utf-8"))
  } catch {
    try {
      return JSON.parse(stripJsonComments(readFileSync(path, "utf-8")))
    } catch {
      return {}
    }
  }
}

export function mergeAgentConfig(existing, ours) {
  const config = structuredClone(existing)
  if (!config.agent) config.agent = {}
  for (const [name, def] of Object.entries(ours)) {
    if (config.agent[name]) {
      const existingDef = config.agent[name]
      config.agent[name] = {
        ...existingDef,
        mode: def.mode,
        model: existingDef.model || def.model,
        description: existingDef.description || def.description,
      }
    } else {
      config.agent[name] = def
    }
  }
  return config
}

export function isSameAgentDef(a, b) {
  if (!a || !b) return false
  return (
    a.mode === b.mode &&
    a.model === b.model &&
    a.description === b.description
  )
}
