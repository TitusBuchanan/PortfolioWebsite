#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# security-scan.sh — Container and dependency security scanning
#                     using Trivy
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
die() { log "FATAL: $*" >&2; exit 1; }

usage() {
    cat <<EOF
Usage: $(basename "$0") --image IMAGE [OPTIONS]

Required:
  --image           Docker image to scan (e.g., registry/app:tag)

Optional:
  --severity        Comma-separated severity levels (default: HIGH,CRITICAL)
  --exit-code       Exit code when vulnerabilities found (default: 1)
  --format          Output format: table, json, sarif (default: table)
  --output-dir      Directory for scan reports (default: ./scan-reports)
  --scan-fs         Also scan the project filesystem for misconfigurations
  --ignore-unfixed  Ignore unfixed vulnerabilities
  --help            Show this help
EOF
    exit 1
}

# -----------------------------------------------------------
# Defaults
# -----------------------------------------------------------
IMAGE=""
SEVERITY="HIGH,CRITICAL"
EXIT_CODE=1
FORMAT="table"
OUTPUT_DIR="${PROJECT_ROOT}/scan-reports"
SCAN_FS=false
IGNORE_UNFIXED=""
TRIVY_CMD="trivy"

# -----------------------------------------------------------
# Parse arguments
# -----------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --image)          IMAGE="$2";          shift 2 ;;
        --severity)       SEVERITY="$2";       shift 2 ;;
        --exit-code)      EXIT_CODE="$2";      shift 2 ;;
        --format)         FORMAT="$2";         shift 2 ;;
        --output-dir)     OUTPUT_DIR="$2";     shift 2 ;;
        --scan-fs)        SCAN_FS=true;        shift   ;;
        --ignore-unfixed) IGNORE_UNFIXED="--ignore-unfixed"; shift ;;
        --help|-h)        usage ;;
        *)                die "Unknown argument: $1" ;;
    esac
done

[[ -n "${IMAGE}" ]] || die "Missing --image"

# -----------------------------------------------------------
# Verify Trivy is installed
# -----------------------------------------------------------
ensure_trivy() {
    if command -v trivy &>/dev/null; then
        log "Trivy version: $(trivy --version 2>&1 | head -1)"
        return
    fi

    log "Trivy not found — installing..."
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    command -v trivy &>/dev/null || die "Trivy installation failed"
    log "Trivy installed: $(trivy --version 2>&1 | head -1)"
}

# -----------------------------------------------------------
# Container image scan
# -----------------------------------------------------------
scan_image() {
    log "=== Container Image Scan ==="
    log "Image:    ${IMAGE}"
    log "Severity: ${SEVERITY}"

    mkdir -p "${OUTPUT_DIR}"

    local json_report="${OUTPUT_DIR}/trivy-image-report.json"
    local table_report="${OUTPUT_DIR}/trivy-image-report.txt"
    local scan_exit=0

    ${TRIVY_CMD} image \
        --severity "${SEVERITY}" \
        ${IGNORE_UNFIXED} \
        --format json \
        --output "${json_report}" \
        "${IMAGE}" || scan_exit=$?

    ${TRIVY_CMD} image \
        --severity "${SEVERITY}" \
        ${IGNORE_UNFIXED} \
        --format table \
        "${IMAGE}" | tee "${table_report}" || true

    local vuln_count
    vuln_count=$(jq '[.Results[]?.Vulnerabilities // [] | length] | add // 0' "${json_report}" 2>/dev/null || echo "unknown")

    log "Vulnerabilities found: ${vuln_count}"
    log "JSON report: ${json_report}"
    log "Table report: ${table_report}"

    if [[ "${FORMAT}" == "sarif" ]]; then
        local sarif_report="${OUTPUT_DIR}/trivy-image-report.sarif"
        ${TRIVY_CMD} image \
            --severity "${SEVERITY}" \
            ${IGNORE_UNFIXED} \
            --format sarif \
            --output "${sarif_report}" \
            "${IMAGE}" || true
        log "SARIF report: ${sarif_report}"
    fi

    return "${scan_exit}"
}

# -----------------------------------------------------------
# Filesystem scan (misconfigurations, secrets, licenses)
# -----------------------------------------------------------
scan_filesystem() {
    if [[ "${SCAN_FS}" != "true" ]]; then
        return 0
    fi

    log "=== Filesystem Scan ==="

    mkdir -p "${OUTPUT_DIR}"

    local fs_report="${OUTPUT_DIR}/trivy-fs-report.json"
    local fs_exit=0

    ${TRIVY_CMD} fs \
        --severity "${SEVERITY}" \
        --scanners vuln,misconfig,secret \
        --format json \
        --output "${fs_report}" \
        "${PROJECT_ROOT}" || fs_exit=$?

    ${TRIVY_CMD} fs \
        --severity "${SEVERITY}" \
        --scanners vuln,misconfig,secret \
        --format table \
        "${PROJECT_ROOT}" || true

    log "Filesystem report: ${fs_report}"
    return "${fs_exit}"
}

# -----------------------------------------------------------
# Summary
# -----------------------------------------------------------
summarize() {
    local image_report="${OUTPUT_DIR}/trivy-image-report.json"

    if [[ ! -f "${image_report}" ]]; then
        log "No image report found — skipping summary"
        return
    fi

    log "=== Scan Summary ==="

    local critical high medium low
    critical=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' "${image_report}" 2>/dev/null || echo 0)
    high=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' "${image_report}" 2>/dev/null || echo 0)
    medium=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="MEDIUM")] | length' "${image_report}" 2>/dev/null || echo 0)
    low=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="LOW")] | length' "${image_report}" 2>/dev/null || echo 0)

    log "CRITICAL: ${critical}  HIGH: ${high}  MEDIUM: ${medium}  LOW: ${low}"
    log "Reports saved to: ${OUTPUT_DIR}/"
}

# -----------------------------------------------------------
# Main
# -----------------------------------------------------------
main() {
    log "Starting security scan..."
    ensure_trivy

    local final_exit=0

    scan_image || final_exit=$?
    scan_filesystem || final_exit=$?
    summarize

    if [[ "${final_exit}" -ne 0 && "${EXIT_CODE}" -ne 0 ]]; then
        die "Security scan found vulnerabilities at or above ${SEVERITY} severity"
    fi

    log "Security scan complete."
}

main "$@"
