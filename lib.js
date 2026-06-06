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

export function readJSONConfig(path) {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, "utf-8"))
  } catch {
    return {}
  }
}

export function mergeAgentConfig(existing, ours) {
  const config = structuredClone(existing)
  if (!config.agent) config.agent = {}
  for (const [name, def] of Object.entries(ours)) {
    if (config.agent[name]) {
      const existingDef = config.agent[name]
      config.agent[name] = {
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
