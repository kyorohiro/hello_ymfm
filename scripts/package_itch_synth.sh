#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
RELEASE_DIR="${ROOT_DIR}/release"
VERSION="${1:-dev}"
STAGE_DIR="${RELEASE_DIR}/itch_synth_${VERSION}"
ZIP_PATH="${RELEASE_DIR}/hello_ymfm_wasm_${VERSION}_itch_synth.zip"

SOURCE_HTML="${ROOT_DIR}/docs/synth/index.html"
SOURCE_JS="${ROOT_DIR}/docs/synth/synth.js"
SOURCE_JS_DIR="${ROOT_DIR}/docs/js"
SOURCE_GENERATED_DIR="${ROOT_DIR}/docs/generated"

if [ ! -f "${SOURCE_HTML}" ]; then
  echo "error: missing file: ${SOURCE_HTML}" >&2
  exit 1
fi

if [ ! -f "${SOURCE_JS}" ]; then
  echo "error: missing file: ${SOURCE_JS}" >&2
  exit 1
fi

if [ ! -d "${SOURCE_JS_DIR}" ]; then
  echo "error: missing directory: ${SOURCE_JS_DIR}" >&2
  exit 1
fi

if [ ! -d "${SOURCE_GENERATED_DIR}" ]; then
  echo "error: missing directory: ${SOURCE_GENERATED_DIR}" >&2
  exit 1
fi

if [ ! -f "${SOURCE_GENERATED_DIR}/ym2612_wasm.js" ] || [ ! -f "${SOURCE_GENERATED_DIR}/ym2612_wasm.wasm" ]; then
  echo "error: YM2612 WASM files are missing in ${SOURCE_GENERATED_DIR}" >&2
  echo "hint: run sh scripts/build_ym2612_wasm.sh first" >&2
  exit 1
fi

mkdir -p "${RELEASE_DIR}"
rm -rf "${STAGE_DIR}"
rm -f "${ZIP_PATH}"
mkdir -p "${STAGE_DIR}/js" "${STAGE_DIR}/generated"

cp "${SOURCE_HTML}" "${STAGE_DIR}/index.html"
cp "${SOURCE_JS}" "${STAGE_DIR}/synth.js"
cp "${SOURCE_JS_DIR}/megasynth.js" "${STAGE_DIR}/js/megasynth.js"
cp "${SOURCE_JS_DIR}/ym2612synth.js" "${STAGE_DIR}/js/ym2612synth.js"
cp "${SOURCE_JS_DIR}/ym2612-worklet.js" "${STAGE_DIR}/js/ym2612-worklet.js"
cp "${SOURCE_GENERATED_DIR}/ym2612_wasm.js" "${STAGE_DIR}/generated/ym2612_wasm.js"
cp "${SOURCE_GENERATED_DIR}/ym2612_wasm.wasm" "${STAGE_DIR}/generated/ym2612_wasm.wasm"

perl -0pi -e 's#import "\\./synth\\.js";#import "./synth.js";#g' "${STAGE_DIR}/index.html"
perl -0pi -e 's#\\.\\./js/#./js/#g; s#\\.\\./generated/#./generated/#g' "${STAGE_DIR}/synth.js"
perl -0pi -e 's#\\./ym2612-worklet\\.js#./js/ym2612-worklet.js#g; s#\\./generated/ym2612_wasm\\.wasm#./generated/ym2612_wasm.wasm#g' "${STAGE_DIR}/js/megasynth.js"
perl -0pi -e 's#\\.\\./generated/ym2612_wasm\\.js#../generated/ym2612_wasm.js#g' "${STAGE_DIR}/js/ym2612-worklet.js"

(
  cd "${STAGE_DIR}"
  zip -r "${ZIP_PATH}" .
)

echo "created stage: ${STAGE_DIR}"
echo "created zip: ${ZIP_PATH}"
echo "itch.io upload:"
echo "  1. Create/Edit project"
echo "  2. Set Kind of project to HTML"
echo "  3. Upload ${ZIP_PATH}"
echo "  4. Ensure index.html is the entry file"
