#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
WEB_DIR="${ROOT_DIR}/web"
DOCS_JS_DIR="${ROOT_DIR}/docs/js"

# Copy only the browser-side runtime files that are intended to stay shared
# between `web/` and `docs/js/`.
#
# `megasynth.js` is intentionally excluded for now because the docs-side copy
# currently has demo/runtime behavior that has not been unified with `web/`.
SYNC_FILES="
genesisaudioengine.js
megadrive-fm-presets.js
segapsg.js
vgmplayer.js
ym2612-worklet.js
ym2612.js
ym2612synth.js
ym2612vgm.js
"

mkdir -p "${DOCS_JS_DIR}"

for file in ${SYNC_FILES}; do
  src="${WEB_DIR}/${file}"
  dst="${DOCS_JS_DIR}/${file}"

  if [ ! -f "${src}" ]; then
    echo "missing source: ${src}" >&2
    exit 1
  fi

  cp "${src}" "${dst}"
  echo "synced ${file}"
done

echo "done: synced shared web runtime files into docs/js"
