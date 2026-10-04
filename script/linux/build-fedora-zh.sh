#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
repo_root="$PWD"
export PATH="$repo_root/.build-tools/bin:$repo_root/node_modules/.bin:$PATH"
export YARN_CACHE_FOLDER="$repo_root/.build-cache/yarn"
export npm_config_cache="$repo_root/.build-cache/npm"
export npm_config_devdir="$repo_root/.build-cache/node-gyp"
export ELECTRON_CACHE="$repo_root/.build-cache/electron"
export NODE_ENV=production RELEASE_CHANNEL=production
export CIRCLE_SHA1="$(git rev-parse HEAD)"
mkdir -p .build-tools/bin artifacts
printf '#!/bin/sh\nexec node "%s/vendor/yarn-1.21.1.js" "$@"\n' "$repo_root" > .build-tools/bin/yarn
chmod +x .build-tools/bin/yarn
git submodule update --init --recursive

# Run only the build prerequisites; the upstream postinstall also prepares
# macOS/Windows and test tooling that this Linux release does not need.
node vendor/yarn-1.21.1.js install --frozen-lockfile --ignore-scripts --non-interactive
node node_modules/node-gyp/bin/node-gyp.js rebuild --directory node_modules/printenvz
node node_modules/process-proxy/script/build.mjs
node node_modules/esbuild/install.js
node node_modules/electron/install.js
node vendor/yarn-1.21.1.js --cwd app install --frozen-lockfile --non-interactive
node vendor/yarn-1.21.1.js compile:prod
node node_modules/ts-node/dist/bin.js -P script/tsconfig.json script/build.ts
application="$repo_root/dist/github-desktop-linux-x64"
node script/linux/localize.cjs "$application/resources/app" localization/zh-CN-3.6.6.json artifacts/localization-report.json
"$application/resources/app/git/bin/git" --version
python3 script/linux/package-rpm.py "$application" --output artifacts
cp localization/zh-CN-3.6.6.json artifacts/zh-CN-3.6.6.json
python3 - <<'PY'
import json, os, pathlib, platform
pathlib.Path('artifacts/build-info.json').write_text(json.dumps({
    'upstreamVersion': '3.6.6', 'translationSource': 'robotze/GithubDesktopZhTool',
    'translationVersion': '3.6.6', 'translationArchiveSHA256': '295b25840815aa5b56289534a11e3221553ccef233f4e655a417f6e7d1d429c2',
    'sourceCommit': os.environ['CIRCLE_SHA1'], 'architecture': platform.machine(),
    'target': 'Fedora 44', 'electron': '42.0.1'
}, indent=2) + '\n')
PY
(cd artifacts && sha256sum *.rpm > SHA256SUMS)
