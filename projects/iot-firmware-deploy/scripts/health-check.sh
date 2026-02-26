#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AZURE_IOT_HUB_NAME="${AZURE_IOT_HUB_NAME:-}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-60}"
MAX_RETRIES="${MAX_RETRIES:-5}"
SUCCESS_THRESHOLD="${SUCCESS_THRESHOLD:-95}"
REPORT_FILE="/tmp/health-report-$(date -u +%Y%m%d%H%M%S).json"

log() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"; }
error() { log "ERROR: $*" >&2; }
die() { error "$*"; exit 1; }

show_help() {
    cat <<EOF
IoT Fleet Health Check Script

Usage: $(basename "$0") [OPTIONS]

Options:
  --deployment-id ID        Check health of specific deployment
  --device-group GROUP      Check specific device group
  --threshold PCT           Success threshold percentage (default: ${SUCCESS_THRESHOLD})
  --interval SECONDS        Check interval in seconds (default: ${HEALTH_CHECK_INTERVAL})
  --max-retries N           Maximum retry attempts (default: ${MAX_RETRIES})
  --watch                   Continuously monitor fleet health
  --report FILE             Output report file (default: stdout)
  --json                    Output in JSON format
  --help                    Show this help message

Environment Variables:
  AZURE_IOT_HUB_NAME        Azure IoT Hub name
  HEALTH_CHECK_INTERVAL     Check interval in seconds
  MAX_RETRIES               Maximum retry count
  SUCCESS_THRESHOLD         Minimum success percentage
EOF
}

validate_prerequisites() {
    [[ -n "$AZURE_IOT_HUB_NAME" ]] || die "AZURE_IOT_HUB_NAME not set"
    command -v az &>/dev/null || die "Azure CLI not found"
    command -v jq &>/dev/null || die "jq not found"
    az account show &>/dev/null || die "Not authenticated with Azure CLI"
}

get_fleet_status() {
    local device_group="${1:-}"
    local query_filter=""

    if [[ -n "$device_group" ]]; then
        query_filter="--query \"[?tags.group=='${device_group}']\""
    fi

    local devices
    devices=$(az iot hub device-twin list \
        --hub-name "$AZURE_IOT_HUB_NAME" \
        --output json 2>/dev/null || echo "[]")

    echo "$devices"
}

check_deployment_health() {
    local deployment_id="${1:-}"

    if [[ -n "$deployment_id" ]]; then
        local config
        config=$(az iot hub configuration show \
            --hub-name "$AZURE_IOT_HUB_NAME" \
            --config-id "$deployment_id" \
            --output json 2>/dev/null || echo "{}")

        if [[ "$config" == "{}" ]]; then
            die "Deployment not found: ${deployment_id}"
        fi

        local applied failed pending
        applied=$(echo "$config" | jq -r '.systemMetrics.results.appliedCount // 0')
        failed=$(echo "$config" | jq -r '.systemMetrics.results.reportingErrorCount // 0')
        pending=$(echo "$config" | jq -r '.systemMetrics.results.targetedCount // 0')

        local total=$((applied + failed))
        local success_rate=0
        if [[ $total -gt 0 ]]; then
            success_rate=$(echo "scale=1; $applied * 100 / $total" | bc 2>/dev/null || echo "0")
        fi

        echo "{\"deploymentId\":\"${deployment_id}\",\"applied\":${applied},\"failed\":${failed},\"pending\":${pending},\"successRate\":${success_rate}}"
    fi
}

get_device_connectivity() {
    local devices
    devices=$(az iot hub query \
        --hub-name "$AZURE_IOT_HUB_NAME" \
        --query-command "SELECT deviceId, connectionState, lastActivityTime, status FROM devices" \
        --output json 2>/dev/null || echo "[]")

    local total connected disconnected
    total=$(echo "$devices" | jq 'length')
    connected=$(echo "$devices" | jq '[.[] | select(.connectionState == "Connected")] | length')
    disconnected=$((total - connected))

    local connectivity_rate=0
    if [[ $total -gt 0 ]]; then
        connectivity_rate=$(echo "scale=1; $connected * 100 / $total" | bc 2>/dev/null || echo "0")
    fi

    echo "{\"total\":${total},\"connected\":${connected},\"disconnected\":${disconnected},\"connectivityRate\":${connectivity_rate}}"
}

get_firmware_versions() {
    local devices
    devices=$(az iot hub query \
        --hub-name "$AZURE_IOT_HUB_NAME" \
        --query-command "SELECT deviceId, properties.reported.firmware.version FROM devices" \
        --output json 2>/dev/null || echo "[]")

    local versions
    versions=$(echo "$devices" | jq -r '[.[] | .version // "unknown"] | group_by(.) | map({version: .[0], count: length}) | sort_by(-.count)')

    echo "$versions"
}

generate_report() {
    local deployment_id="${1:-}"
    local device_group="${2:-}"
    local json_output="${3:-false}"

    log "Generating fleet health report..."

    local connectivity
    connectivity=$(get_device_connectivity)

    local firmware_versions
    firmware_versions=$(get_firmware_versions)

    local deployment_health="{}"
    if [[ -n "$deployment_id" ]]; then
        deployment_health=$(check_deployment_health "$deployment_id")
    fi

    local report
    report=$(jq -n \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg hub "$AZURE_IOT_HUB_NAME" \
        --arg group "${device_group:-all}" \
        --argjson connectivity "$connectivity" \
        --argjson firmwareVersions "$firmware_versions" \
        --argjson deployment "$deployment_health" \
        '{
            timestamp: $timestamp,
            iotHub: $hub,
            deviceGroup: $group,
            connectivity: $connectivity,
            firmwareVersions: $firmwareVersions,
            deployment: $deployment
        }')

    if [[ "$json_output" == true ]]; then
        echo "$report" | jq .
    else
        echo ""
        echo "======================================"
        echo "  Fleet Health Report"
        echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "======================================"
        echo ""
        echo "IoT Hub:      ${AZURE_IOT_HUB_NAME}"
        [[ -n "$device_group" ]] && echo "Device Group: ${device_group}"
        echo ""
        echo "--- Connectivity ---"
        echo "  Total Devices:  $(echo "$connectivity" | jq -r '.total')"
        echo "  Connected:      $(echo "$connectivity" | jq -r '.connected')"
        echo "  Disconnected:   $(echo "$connectivity" | jq -r '.disconnected')"
        echo "  Rate:           $(echo "$connectivity" | jq -r '.connectivityRate')%"
        echo ""
        echo "--- Firmware Versions ---"
        echo "$firmware_versions" | jq -r '.[] | "  \(.version): \(.count) devices"'
        echo ""
        if [[ -n "$deployment_id" ]]; then
            echo "--- Deployment: ${deployment_id} ---"
            echo "  Applied:   $(echo "$deployment_health" | jq -r '.applied')"
            echo "  Failed:    $(echo "$deployment_health" | jq -r '.failed')"
            echo "  Pending:   $(echo "$deployment_health" | jq -r '.pending')"
            echo "  Success:   $(echo "$deployment_health" | jq -r '.successRate')%"
        fi
        echo ""
        echo "======================================"
    fi

    echo "$report" > "$REPORT_FILE"
    log "Report saved to ${REPORT_FILE}"
}

watch_health() {
    local deployment_id="${1:-}"
    local device_group="${2:-}"
    local retry_count=0

    log "Watching fleet health (interval: ${HEALTH_CHECK_INTERVAL}s)..."

    while true; do
        local health
        if [[ -n "$deployment_id" ]]; then
            health=$(check_deployment_health "$deployment_id")
            local success_rate
            success_rate=$(echo "$health" | jq -r '.successRate')

            log "Deployment ${deployment_id}: success=${success_rate}%, applied=$(echo "$health" | jq -r '.applied'), failed=$(echo "$health" | jq -r '.failed')"

            local rate_int
            rate_int=${success_rate%.*}
            if [[ ${rate_int:-0} -ge $SUCCESS_THRESHOLD ]]; then
                log "SUCCESS: Fleet health exceeds threshold (${success_rate}% >= ${SUCCESS_THRESHOLD}%)"
                generate_report "$deployment_id" "$device_group" false
                exit 0
            fi

            local failed
            failed=$(echo "$health" | jq -r '.failed')
            if [[ ${failed:-0} -gt 0 ]]; then
                retry_count=$((retry_count + 1))
                if [[ $retry_count -ge $MAX_RETRIES ]]; then
                    error "FAILED: Too many failures detected after ${MAX_RETRIES} checks."
                    generate_report "$deployment_id" "$device_group" false
                    exit 1
                fi
                log "WARNING: ${failed} failures detected (retry ${retry_count}/${MAX_RETRIES})"
            fi
        else
            local connectivity
            connectivity=$(get_device_connectivity)
            log "Fleet: connected=$(echo "$connectivity" | jq -r '.connected')/$(echo "$connectivity" | jq -r '.total') ($(echo "$connectivity" | jq -r '.connectivityRate')%)"
        fi

        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

DEPLOYMENT_ID=""
DEVICE_GROUP=""
WATCH_MODE=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --deployment-id)  DEPLOYMENT_ID="$2"; shift 2 ;;
        --device-group)   DEVICE_GROUP="$2"; shift 2 ;;
        --threshold)      SUCCESS_THRESHOLD="$2"; shift 2 ;;
        --interval)       HEALTH_CHECK_INTERVAL="$2"; shift 2 ;;
        --max-retries)    MAX_RETRIES="$2"; shift 2 ;;
        --watch)          WATCH_MODE=true; shift ;;
        --report)         REPORT_FILE="$2"; shift 2 ;;
        --json)           JSON_OUTPUT=true; shift ;;
        --help)           show_help; exit 0 ;;
        *)                die "Unknown option: $1" ;;
    esac
done

validate_prerequisites

if [[ "$WATCH_MODE" == true ]]; then
    watch_health "$DEPLOYMENT_ID" "$DEVICE_GROUP"
else
    generate_report "$DEPLOYMENT_ID" "$DEVICE_GROUP" "$JSON_OUTPUT"
fi
