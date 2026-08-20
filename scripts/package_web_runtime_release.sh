#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
RELEASE_DIR="${ROOT_DIR}/release"
VERSION="${1:-dev}"
OUTPUT_NAME="hello_ymfm_wasm_${VERSION}_web_runtime.zip"
OUTPUT_PATH="${RELEASE_DIR}/${OUTPUT_NAME}"

WEB_DIR="${ROOT_DIR}/web"
GENERATED_DIR="${ROOT_DIR}/docs/generated"

if [ ! -d "${WEB_DIR}" ]; then
  echo "error: missing directory: ${WEB_DIR}" >&2
  exit 1
fi

if [ ! -d "${GENERATED_DIR}" ]; then
  echo "error: missing directory: ${GENERATED_DIR}" >&2
  exit 1
fi

if [ ! -f "${GENERATED_DIR}/ym2612_wasm.js" ] || [ ! -f "${GENERATED_DIR}/ym2612_wasm.wasm" ]; then
  echo "error: YM2612 WASM files are missing in ${GENERATED_DIR}" >&2
  echo "hint: run sh scripts/build_ym2612_wasm.sh first" >&2
  exit 1
fi

if [ ! -f "${GENERATED_DIR}/segapsg_wasm.js" ] || [ ! -f "${GENERATED_DIR}/segapsg_wasm.wasm" ]; then
  echo "error: Sega PSG WASM files are missing in ${GENERATED_DIR}" >&2
  echo "hint: run sh scripts/build_segapsg_wasm.sh first" >&2
  exit 1
fi

mkdir -p "${RELEASE_DIR}"
rm -f "${OUTPUT_PATH}"

(
  cd "${ROOT_DIR}"
  zip -r "${OUTPUT_PATH}" \
    web \
    docs/generated
)

echo "created: ${OUTPUT_PATH}"
