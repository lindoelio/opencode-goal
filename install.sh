#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCODE_DIR="${HOME}/.config/opencode"

echo "▸ Installing opencode-goal..."

mkdir -p "${OPENCODE_DIR}"/{commands,agents,skills}

cp -r "${PLUGIN_DIR}"/commands/* "${OPENCODE_DIR}"/commands/ 2>/dev/null || true
cp -r "${PLUGIN_DIR}"/agents/* "${OPENCODE_DIR}"/agents/ 2>/dev/null || true
cp -r "${PLUGIN_DIR}"/skills/* "${OPENCODE_DIR}"/skills/ 2>/dev/null || true

echo "  ✓ Copied commands, agents, and skills"
echo "  ✓ Run 'node install.js' to configure opencode.json agents, or configure manually."
echo "▸ opencode-goal installed."
