#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${BUILD_OUTPUT:-/output}"
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-}"
AZURE_STORAGE_CONTAINER="${AZURE_STORAGE_CONTAINER:-firmware}"
AZURE_IOT_HUB_NAME="${AZURE_IOT_HUB_NAME:-}"
ROLLBACK_LOG="/tmp/rollback-$(date -u +%Y%m%d%H%M%S).log"

log() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*" | tee -a "$ROLLBACK_LOG"; }
error() { log "ERROR: $*" >&2; }
die() { error "$*"; exit 1; }

show_help() {
    cat <<EOF
IoT Firmware Rollback Script

Usage: $(basename "$0") [OPTIONS]

Options:
  --to-version VERSION    Target version to roll back to
  --to-build-id BUILD_ID  Specific build ID to roll back to
  --steps N               Roll back N versions (default: 1)
  --device-group GROUP    Target device group
  --force                 Skip confirmation prompt
  --list                  List available versions for rollback
  --dry-run               Simulate rollback without changes
  --help                  Show this help message

Environment Variables:
  AZURE_STORAGE_ACCOUNT   Azure Storage account name
  AZURE_STORAGE_CONTAINER Azure Blob container name
  AZURE_IOT_HUB_NAME      Azure IoT Hub name
EOF
}

validate_prerequisites() {
    log "Validating rollback prerequisites..."

    local required_vars=("AZURE_STORAGE_ACCOUNT" "AZURE_IOT_HUB_NAME")
    for var in "${required_vars[@]}"; do
        [[ -n "${!var:-}" ]] || die "Required variable not set: ${var}"
    done

    for tool in az jq; do
        command -v "$tool" &>/dev/null || die "Required tool not found: ${tool}"
    done

    az account show &>/dev/null || die "Not authenticated with Azure CLI."

    log "Prerequisites validated."
}

list_available_versions() {
    log "Available firmware versions:"
    echo ""

    if [[ -d "$OUTPUT_DIR" ]]; then
        echo "Local builds:"
        for dir in $(ls -d "${OUTPUT_DIR}/"* 2>/dev/null | sort -r); do
            local manifest="${dir}/manifest.json"
            if [[ -f "$manifest" ]]; then
                local version build_id build_type timestamp
                version=$(jq -r '.version' "$manifest")
                build_id=$(jq -r '.buildId' "$manifest")
                build_type=$(jq -r '.buildType' "$manifest")
                timestamp=$(jq -r '.timestamp' "$manifest")
                printf "  %-15s %-30s %-10s %s\n" "$version" "$build_id" "$build_type" "$timestamp"
            fi
        done
    fi

    echo ""
    echo "Remote builds (Azure Blob):"
    az storage blob list \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --container-name "$AZURE_STORAGE_CONTAINER" \
        --prefix "builds/" \
        --query "[?contains(name, 'manifest.json')].{name:name, modified:properties.lastModified}" \
        --output table \
        2>/dev/null || log "Could not list remote builds."
}

get_current_deployment() {
    log "Fetching current deployment from IoT Hub..."

    local current
    current=$(az iot hub configuration list \
        --hub-name "$AZURE_IOT_HUB_NAME" \
        --query "sort_by([?targetCondition], &priority) | [-1]" \
        --output json 2>/dev/null || echo "{}")

    if [[ "$current" != "{}" && "$current" != "null" && -n "$current" ]]; then
        local current_id
        current_id=$(echo "$current" | jq -r '.id // "unknown"')
        log "Current deployment: ${current_id}"
        echo "$current"
    else
        log "No active deployment found."
        echo "{}"
    fi
}

find_rollback_target() {
    local to_version="$1"
    local to_build_id="$2"
    local steps="$3"

    if [[ -n "$to_build_id" ]]; then
        local target_dir="${OUTPUT_DIR}/${to_build_id}"
        [[ -d "$target_dir" ]] || die "Build not found: ${to_build_id}"
        echo "$target_dir"
        return
    fi

    if [[ -n "$to_version" ]]; then
        local target_dir
        target_dir=$(ls -d "${OUTPUT_DIR}/${to_version}-"* 2>/dev/null | sort -r | head -1)
        [[ -n "$target_dir" && -d "$target_dir" ]] || die "No build found for version: ${to_version}"
        echo "$target_dir"
        return
    fi

    local all_builds
    all_builds=$(ls -d "${OUTPUT_DIR}/"* 2>/dev/null | sort -r)
    local target_dir
    target_dir=$(echo "$all_builds" | sed -n "$((steps + 1))p")
    [[ -n "$target_dir" && -d "$target_dir" ]] || die "Cannot roll back ${steps} versions. Not enough builds available."
    echo "$target_dir"
}

perform_rollback() {
    local target_dir="$1"
    local device_group="$2"
    local manifest="${target_dir}/manifest.json"

    [[ -f "$manifest" ]] || die "Manifest not found in rollback target: ${target_dir}"

    local version
    version=$(jq -r '.version' "$manifest")
    local build_id
    build_id=$(jq -r '.buildId' "$manifest")

    log "Rolling back to version ${version} (build: ${build_id})..."

    log "Deactivating current deployment..."
    local current_config_id
    current_config_id=$(az iot hub configuration list \
        --hub-name "$AZURE_IOT_HUB_NAME" \
        --query "sort_by([?targetCondition], &priority) | [-1].id" \
        --output tsv 2>/dev/null || echo "")

    if [[ -n "$current_config_id" && "$current_config_id" != "None" ]]; then
        az iot hub configuration delete \
            --hub-name "$AZURE_IOT_HUB_NAME" \
            --config-id "$current_config_id" \
            2>&1 | tee -a "$ROLLBACK_LOG" || log "WARNING: Could not delete current config."
    fi

    local blob_prefix="builds/${version}/${build_id}"
    local firmware_url="https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER}/${blob_prefix}/app-${version}.bin"
    local rollback_id="rollback-${version}-$(date -u +%Y%m%d%H%M%S)"

    local target_condition="*"
    [[ -n "$device_group" ]] && target_condition="tags.group='${device_group}'"

    local config_content
    config_content=$(jq -n --arg url "$firmware_url" --arg id "$rollback_id" \
        '{ deviceContent: { "properties.desired.firmware": { url: $url, deploymentId: $id, isRollback: true } } }')

    az iot hub configuration create \
        --hub-name "$AZURE_IOT_HUB_NAME" \
        --config-id "$rollback_id" \
        --content "$config_content" \
        --target-condition "$target_condition" \
        --priority 20 \
        2>&1 | tee -a "$ROLLBACK_LOG"

    log "Rollback deployment created: ${rollback_id}"
}

TO_VERSION=""
TO_BUILD_ID=""
STEPS=1
DEVICE_GROUP=""
FORCE=false
LIST_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --to-version)     TO_VERSION="$2"; shift 2 ;;
        --to-build-id)    TO_BUILD_ID="$2"; shift 2 ;;
        --steps)          STEPS="$2"; shift 2 ;;
        --device-group)   DEVICE_GROUP="$2"; shift 2 ;;
        --force)          FORCE=true; shift ;;
        --list)           LIST_ONLY=true; shift ;;
        --dry-run)        DRY_RUN=true; shift ;;
        --help)           show_help; exit 0 ;;
        *)                die "Unknown option: $1" ;;
    esac
done

validate_prerequisites

if [[ "$LIST_ONLY" == true ]]; then
    list_available_versions
    exit 0
fi

log "========================================="
log "IoT Firmware Rollback"
log "========================================="

target_dir=$(find_rollback_target "$TO_VERSION" "$TO_BUILD_ID" "$STEPS")
target_manifest="${target_dir}/manifest.json"
target_version=$(jq -r '.version' "$target_manifest")
target_build=$(jq -r '.buildId' "$target_manifest")

log "Rollback target: ${target_version} (${target_build})"

if [[ "$DRY_RUN" == true ]]; then
    log "DRY RUN: Would roll back to ${target_version}"
    log "DRY RUN complete. No changes made."
    exit 0
fi

if [[ "$FORCE" != true ]]; then
    echo ""
    echo "About to roll back to firmware version: ${target_version}"
    echo "Build: ${target_build}"
    [[ -n "$DEVICE_GROUP" ]] && echo "Device group: ${DEVICE_GROUP}"
    echo ""
    read -r -p "Continue? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || die "Rollback cancelled by user."
fi

perform_rollback "$target_dir" "$DEVICE_GROUP"

log "========================================="
log "Rollback completed successfully!"
log "Target version: ${target_version}"
log "Log: ${ROLLBACK_LOG}"
log "========================================="
