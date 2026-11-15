#!/usr/bin/env bash
# Toon Kit setup (Mac / Linux). Run once: bash setup.sh
set -e
cd "$(dirname "$0")"
say() { printf "\033[36m[setup]\033[0m %s\n" "$1"; }
fail() { printf "\033[31m[setup]\033[0m %s\n" "$1"; exit 1; }

command -v node >/dev/null 2>&1 || fail "Node.js not found. Install Node 18+ (Mac: brew install node)"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 18 ] || fail "Node $NODE_MAJOR found — need 18 or newer"
command -v ffmpeg >/dev/null 2>&1 || fail "ffmpeg not found (Mac: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg)"
say "node $(node -v), ffmpeg ok"

say "installing packages + headless Chrome for rendering (~200 MB, one time)…"
npm install --no-fund --no-audit

[ -f .env ] || { cp .env.example .env; say "created .env — add your ElevenLabs key there (optional: OpenAI or fal key for AI backgrounds)"; }

say "test render…"
node kit/cli.js frame demo s04@3 --out setup-test.png >/dev/null && say "✓ renderer works → projects/demo/out/setup-test.png"
say "done. Open this folder in Claude Code and say:  make a video about why the stock market crashed"
