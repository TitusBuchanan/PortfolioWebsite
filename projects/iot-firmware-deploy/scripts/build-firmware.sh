#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${FIRMWARE_WORKSPACE:-/workspace}"
OUTPUT_DIR="${BUILD_OUTPUT:-/output}"
BUILD_TYPE="${BUILD_TYPE:-release}"
VERSION="${FIRMWARE_VERSION:-0.0.0-dev}"
BUILD_TARGET="${BUILD_TARGET:-all}"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
BUILD_ID="${VERSION}-${TIMESTAMP}"
ARTIFACT_DIR="${OUTPUT_DIR}/${BUILD_ID}"
MANIFEST_FILE="${ARTIFACT_DIR}/manifest.json"
CHECKSUM_FILE="${ARTIFACT_DIR}/checksums.sha256"

log() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"; }
error() { log "ERROR: $*" >&2; }
die() { error "$*"; exit 1; }

show_help() {
    cat <<EOF
IoT Firmware Build Script

Usage: $(basename "$0") [OPTIONS]

Options:
  --version VERSION     Firmware version (default: ${VERSION})
  --target TARGET       Build target: all, app, bootloader, tests (default: ${BUILD_TARGET})
  --type TYPE           Build type: release, debug, minsize (default: ${BUILD_TYPE})
  --output DIR          Output directory (default: ${OUTPUT_DIR})
  --sign                Sign the firmware binary
  --clean               Clean build artifacts before building
  --help                Show this help message

Environment Variables:
  FIRMWARE_VERSION      Firmware version string
  BUILD_TARGET          Build target
  BUILD_TYPE            Build type (release/debug/minsize)
  FIRMWARE_WORKSPACE    Source workspace directory
  BUILD_OUTPUT          Output directory for artifacts
  SIGNING_KEY_PATH      Path to firmware signing key
EOF
}

validate_environment() {
    log "Validating build environment..."

    local required_tools=("cmake" "make" "sha256sum" "jq")
    for tool in "${required_tools[@]}"; do
        command -v "$tool" >/dev/null 2>&1 || die "Required tool not found: ${tool}"
    done

    [[ -d "$WORKSPACE" ]] || die "Workspace directory not found: ${WORKSPACE}"

    mkdir -p "$ARTIFACT_DIR"
    log "Build environment validated."
}

clean_build() {
    log "Cleaning previous build artifacts..."
    rm -rf "${WORKSPACE}/build"
    log "Clean complete."
}

build_firmware() {
    local target="$1"
    log "Building firmware target: ${target} (${BUILD_TYPE})..."

    local build_dir="${WORKSPACE}/build/${target}"
    mkdir -p "$build_dir"

    local cmake_flags="-DCMAKE_BUILD_TYPE=${BUILD_TYPE}"
    cmake_flags+=" -DFIRMWARE_VERSION=${VERSION}"
    cmake_flags+=" -DBUILD_TIMESTAMP=${TIMESTAMP}"

    if [[ "$BUILD_TYPE" == "release" ]]; then
        cmake_flags+=" -DCMAKE_C_FLAGS_RELEASE=-Os"
        cmake_flags+=" -DENABLE_LTO=ON"
    elif [[ "$BUILD_TYPE" == "debug" ]]; then
        cmake_flags+=" -DENABLE_DEBUG_SYMBOLS=ON"
        cmake_flags+=" -DENABLE_LOGGING=ON"
    fi

    if [[ -f "${WORKSPACE}/CMakeLists.txt" ]]; then
        cd "$build_dir"
        cmake ${cmake_flags} "$WORKSPACE" 2>&1 | tee "${ARTIFACT_DIR}/${target}-cmake.log"
        make -j"$(nproc)" 2>&1 | tee "${ARTIFACT_DIR}/${target}-build.log"
    else
        log "No CMakeLists.txt found; generating placeholder binary for target: ${target}"
        echo "FIRMWARE:${target}:${VERSION}:${TIMESTAMP}" > "${build_dir}/${target}.bin"
    fi

    local binary_name="${target}-${VERSION}.bin"
    if [[ -f "${build_dir}/${target}.bin" ]]; then
        cp "${build_dir}/${target}.bin" "${ARTIFACT_DIR}/${binary_name}"
    elif [[ -f "${build_dir}/${target}.elf" ]]; then
        if command -v arm-none-eabi-objcopy &>/dev/null; then
            arm-none-eabi-objcopy -O binary "${build_dir}/${target}.elf" "${ARTIFACT_DIR}/${binary_name}"
        else
            cp "${build_dir}/${target}.elf" "${ARTIFACT_DIR}/${binary_name}"
        fi
    fi

    log "Build complete for target: ${target}"
}

generate_checksums() {
    log "Generating checksums..."
    cd "$ARTIFACT_DIR"
    sha256sum *.bin > "$CHECKSUM_FILE" 2>/dev/null || log "No binaries found for checksums."
    log "Checksums written to ${CHECKSUM_FILE}"
}

sign_firmware() {
    local key_path="${SIGNING_KEY_PATH:-}"

    if [[ -z "$key_path" || ! -f "$key_path" ]]; then
        log "WARNING: Signing key not found. Skipping firmware signing."
        return 0
    fi

    log "Signing firmware binaries..."
    for bin_file in "${ARTIFACT_DIR}"/*.bin; do
        [[ -f "$bin_file" ]] || continue
        local sig_file="${bin_file}.sig"
        openssl dgst -sha256 -sign "$key_path" -out "$sig_file" "$bin_file"
        log "Signed: $(basename "$bin_file")"
    done
    log "Firmware signing complete."
}

generate_manifest() {
    log "Generating build manifest..."

    local binaries=()
    for bin_file in "${ARTIFACT_DIR}"/*.bin; do
        [[ -f "$bin_file" ]] || continue
        local name
        name="$(basename "$bin_file")"
        local size
        size="$(stat -c%s "$bin_file" 2>/dev/null || stat -f%z "$bin_file" 2>/dev/null || echo 0)"
        local checksum
        checksum="$(sha256sum "$bin_file" | awk '{print $1}')"
        local signed="false"
        [[ -f "${bin_file}.sig" ]] && signed="true"
        binaries+=("{\"name\":\"${name}\",\"size\":${size},\"sha256\":\"${checksum}\",\"signed\":${signed}}")
    done

    local binaries_json
    binaries_json="$(printf '%s\n' "${binaries[@]}" | jq -s '.')"

    jq -n \
        --arg version "$VERSION" \
        --arg buildId "$BUILD_ID" \
        --arg buildType "$BUILD_TYPE" \
        --arg target "$BUILD_TARGET" \
        --arg timestamp "$TIMESTAMP" \
        --arg gitCommit "$(git -C "$WORKSPACE" rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --arg gitBranch "$(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')" \
        --argjson binaries "$binaries_json" \
        '{
            version: $version,
            buildId: $buildId,
            buildType: $buildType,
            target: $target,
            timestamp: $timestamp,
            git: { commit: $gitCommit, branch: $gitBranch },
            binaries: $binaries
        }' > "$MANIFEST_FILE"

    log "Manifest written to ${MANIFEST_FILE}"
}

SIGN_FIRMWARE=false
CLEAN_BUILD=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --version)  VERSION="$2"; shift 2 ;;
        --target)   BUILD_TARGET="$2"; shift 2 ;;
        --type)     BUILD_TYPE="$2"; shift 2 ;;
        --output)   OUTPUT_DIR="$2"; shift 2 ;;
        --sign)     SIGN_FIRMWARE=true; shift ;;
        --clean)    CLEAN_BUILD=true; shift ;;
        --help)     show_help; exit 0 ;;
        *)          die "Unknown option: $1" ;;
    esac
done

log "========================================="
log "IoT Firmware Build"
log "Version:    ${VERSION}"
log "Build ID:   ${BUILD_ID}"
log "Target:     ${BUILD_TARGET}"
log "Type:       ${BUILD_TYPE}"
log "========================================="

validate_environment

if [[ "$CLEAN_BUILD" == true ]]; then
    clean_build
fi

if [[ "$BUILD_TARGET" == "all" ]]; then
    for target in app bootloader; do
        build_firmware "$target"
    done
else
    build_firmware "$BUILD_TARGET"
fi

generate_checksums

if [[ "$SIGN_FIRMWARE" == true ]]; then
    sign_firmware
fi

generate_manifest

log "========================================="
log "Build completed successfully!"
log "Artifacts: ${ARTIFACT_DIR}"
log "========================================="
