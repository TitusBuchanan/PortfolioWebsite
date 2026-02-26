#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${BUILD_OUTPUT:-/output}"
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-}"
AZURE_STORAGE_CONTAINER="${AZURE_STORAGE_CONTAINER:-firmware}"
AZURE_IOT_HUB_NAME="${AZURE_IOT_HUB_NAME:-}"
DEPLOY_STRATEGY="${DEPLOY_STRATEGY:-rolling}"
DEPLOY_BATCH_SIZE="${DEPLOY_BATCH_SIZE:-10}"
ROLLOUT_PERCENTAGE="${ROLLOUT_PERCENTAGE:-100}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-60}"
DEPLOYMENT_LOG="/tmp/deployment-$(date -u +%Y%m%d%H%M%S).log"

log() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*" | tee -a "$DEPLOYMENT_LOG"; }
error() { log "ERROR: $*" >&2; }
die() { error "$*"; exit 1; }

show_help() {
    cat <<EOF
IoT Firmware Deployment Script

Usage: $(basename "$0") [OPTIONS]

Options:
  --version VERSION           Firmware version to deploy
  --build-id BUILD_ID         Specific build ID to deploy
  --strategy STRATEGY         Deployment strategy: rolling, canary, blue-green (default: ${DEPLOY_STRATEGY})
  --batch-size SIZE           Number of devices per batch (default: ${DEPLOY_BATCH_SIZE})
  --rollout-percentage PCT    Percentage of fleet to update (default: ${ROLLOUT_PERCENTAGE})
  --device-group GROUP        Target device group
  --dry-run                   Simulate deployment without making changes
  --watch                     Watch for new builds and deploy automatically
  --help                      Show this help message

Environment Variables:
  AZURE_STORAGE_ACCOUNT       Azure Storage account name
  AZURE_STORAGE_CONTAINER     Azure Blob container name (default: firmware)
  AZURE_IOT_HUB_NAME          Azure IoT Hub name
  DEPLOY_STRATEGY             Deployment strategy
  DEPLOY_BATCH_SIZE           Devices per deployment batch
  ROLLOUT_PERCENTAGE          Fleet rollout percentage
EOF
}

validate_prerequisites() {
    log "Validating deployment prerequisites..."

    local required_vars=("AZURE_STORAGE_ACCOUNT" "AZURE_IOT_HUB_NAME")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            die "Required environment variable not set: ${var}"
        fi
    done

    local required_tools=("az" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            die "Required tool not found: ${tool}"
        fi
    done

    az account show &>/dev/null || die "Not authenticated with Azure CLI. Run 'az login' first."

    log "Prerequisites validated."
}

find_latest_build() {
    local version="${1:-}"
    local build_dir

    if [[ -n "$version" ]]; then
        build_dir=$(ls -d "${OUTPUT_DIR}/${version}-"* 2>/dev/null | sort -r | head -1)
    else
        build_dir=$(ls -d "${OUTPUT_DIR}/"* 2>/dev/null | sort -r | head -1)
    fi

    if [[ -z "$build_dir" || ! -d "$build_dir" ]]; then
        die "No build artifacts found in ${OUTPUT_DIR}"
    fi

    echo "$build_dir"
}

verify_build_integrity() {
    local build_dir="$1"
    local manifest="${build_dir}/manifest.json"
    local checksum_file="${build_dir}/checksums.sha256"

    log "Verifying build integrity..."

    [[ -f "$manifest" ]] || die "Manifest not found: ${manifest}"

    if [[ -f "$checksum_file" ]]; then
        cd "$build_dir"
        if sha256sum -c "$checksum_file" --quiet 2>/dev/null; then
            log "Checksum verification passed."
        else
            die "Checksum verification failed!"
        fi
    else
        log "WARNING: No checksum file found. Skipping integrity check."
    fi

    local version
    version=$(jq -r '.version' "$manifest")
    local build_id
    build_id=$(jq -r '.buildId' "$manifest")
    log "Build verified: version=${version}, buildId=${build_id}"
}

upload_to_blob() {
    local build_dir="$1"
    local manifest="${build_dir}/manifest.json"
    local version
    version=$(jq -r '.version' "$manifest")
    local build_id
    build_id=$(jq -r '.buildId' "$manifest")
    local blob_prefix="builds/${version}/${build_id}"

    log "Uploading firmware to Azure Blob Storage..."
    log "Account: ${AZURE_STORAGE_ACCOUNT}, Container: ${AZURE_STORAGE_CONTAINER}"

    for file in "${build_dir}"/*; do
        [[ -f "$file" ]] || continue
        local filename
        filename="$(basename "$file")"
        log "Uploading: ${filename}..."

        az storage blob upload \
            --account-name "$AZURE_STORAGE_ACCOUNT" \
            --container-name "$AZURE_STORAGE_CONTAINER" \
            --name "${blob_prefix}/${filename}" \
            --file "$file" \
            --overwrite \
            --no-progress \
            2>&1 | tee -a "$DEPLOYMENT_LOG"
    done

    log "Upload complete. Blob prefix: ${blob_prefix}"
    echo "$blob_prefix"
}

create_deployment_config() {
    local version="$1"
    local blob_prefix="$2"
    local strategy="$3"
    local blob_url="https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER}/${blob_prefix}"

    local config
    config=$(jq -n \
        --arg version "$version" \
        --arg blobUrl "$blob_url" \
        --arg strategy "$strategy" \
        --argjson batchSize "$DEPLOY_BATCH_SIZE" \
        --argjson rolloutPct "$ROLLOUT_PERCENTAGE" \
        --argjson healthInterval "$HEALTH_CHECK_INTERVAL" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{
            id: ("deploy-" + $version + "-" + ($timestamp | gsub("[:-]"; ""))),
            content: {
                version: $version,
                firmwareUrl: ($blobUrl + "/app-" + $version + ".bin"),
                checksumUrl: ($blobUrl + "/checksums.sha256"),
                manifestUrl: ($blobUrl + "/manifest.json")
            },
            deployment: {
                strategy: $strategy,
                batchSize: $batchSize,
                rolloutPercentage: $rolloutPct,
                healthCheckIntervalSeconds: $healthInterval
            },
            createdAt: $timestamp
        }')

    echo "$config"
}

notify_iot_hub() {
    local deploy_config="$1"
    local device_group="${2:-}"

    log "Creating IoT Hub deployment configuration..."

    local deployment_id
    deployment_id=$(echo "$deploy_config" | jq -r '.id')
    local firmware_url
    firmware_url=$(echo "$deploy_config" | jq -r '.content.firmwareUrl')

    local target_condition="*"
    if [[ -n "$device_group" ]]; then
        target_condition="tags.group='${device_group}'"
    fi

    local iot_config
    iot_config=$(jq -n \
        --arg id "$deployment_id" \
        --arg firmwareUrl "$firmware_url" \
        --arg targetCondition "$target_condition" \
        --argjson priority 10 \
        '{
            id: $id,
            content: {
                deviceContent: {
                    "properties.desired.firmware": {
                        url: $firmwareUrl,
                        deploymentId: $id
                    }
                }
            },
            targetCondition: $targetCondition,
            priority: $priority
        }')

    log "Notifying IoT Hub: ${AZURE_IOT_HUB_NAME}"
    az iot hub configuration create \
        --hub-name "$AZURE_IOT_HUB_NAME" \
        --config-id "$deployment_id" \
        --content "$(echo "$iot_config" | jq '.content')" \
        --target-condition "$target_condition" \
        --priority 10 \
        2>&1 | tee -a "$DEPLOYMENT_LOG"

    log "IoT Hub deployment created: ${deployment_id}"
}

watch_for_builds() {
    log "Watching for new builds in ${OUTPUT_DIR}..."
    local last_build=""

    while true; do
        local latest_build
        latest_build=$(ls -d "${OUTPUT_DIR}/"* 2>/dev/null | sort -r | head -1 || true)

        if [[ -n "$latest_build" && "$latest_build" != "$last_build" ]]; then
            log "New build detected: $(basename "$latest_build")"
            deploy_build "$latest_build"
            last_build="$latest_build"
        fi

        sleep 30
    done
}

deploy_build() {
    local build_dir="$1"
    local manifest="${build_dir}/manifest.json"

    verify_build_integrity "$build_dir"

    local version
    version=$(jq -r '.version' "$manifest")

    local blob_prefix
    blob_prefix=$(upload_to_blob "$build_dir")

    local deploy_config
    deploy_config=$(create_deployment_config "$version" "$blob_prefix" "$DEPLOY_STRATEGY")

    notify_iot_hub "$deploy_config" "${DEVICE_GROUP:-}"

    log "Deployment initiated for version ${version}"
    log "Strategy: ${DEPLOY_STRATEGY}, Batch: ${DEPLOY_BATCH_SIZE}, Rollout: ${ROLLOUT_PERCENTAGE}%"
    log "Deployment log: ${DEPLOYMENT_LOG}"
}

VERSION=""
BUILD_ID=""
DEVICE_GROUP=""
DRY_RUN=false
WATCH_MODE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --version)              VERSION="$2"; shift 2 ;;
        --build-id)             BUILD_ID="$2"; shift 2 ;;
        --strategy)             DEPLOY_STRATEGY="$2"; shift 2 ;;
        --batch-size)           DEPLOY_BATCH_SIZE="$2"; shift 2 ;;
        --rollout-percentage)   ROLLOUT_PERCENTAGE="$2"; shift 2 ;;
        --device-group)         DEVICE_GROUP="$2"; shift 2 ;;
        --dry-run)              DRY_RUN=true; shift ;;
        --watch)                WATCH_MODE=true; shift ;;
        --help)                 show_help; exit 0 ;;
        *)                      die "Unknown option: $1" ;;
    esac
done

if [[ "$WATCH_MODE" == true ]]; then
    watch_for_builds
    exit 0
fi

validate_prerequisites

log "========================================="
log "IoT Firmware Deployment"
log "Strategy:   ${DEPLOY_STRATEGY}"
log "Batch Size: ${DEPLOY_BATCH_SIZE}"
log "Rollout:    ${ROLLOUT_PERCENTAGE}%"
log "========================================="

local_build_dir=""
if [[ -n "$BUILD_ID" ]]; then
    local_build_dir="${OUTPUT_DIR}/${BUILD_ID}"
    [[ -d "$local_build_dir" ]] || die "Build not found: ${local_build_dir}"
else
    local_build_dir=$(find_latest_build "$VERSION")
fi

if [[ "$DRY_RUN" == true ]]; then
    log "DRY RUN: Would deploy from ${local_build_dir}"
    verify_build_integrity "$local_build_dir"
    log "DRY RUN complete. No changes made."
    exit 0
fi

deploy_build "$local_build_dir"

log "========================================="
log "Deployment completed successfully!"
log "Log: ${DEPLOYMENT_LOG}"
log "========================================="
