#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Health Checker
#
# Checks service endpoints, disk space, memory, and CPU load.
# Sends alerts via AWS SNS when thresholds are exceeded.
#
# Usage:
#   ./health_checker.sh --config /etc/health_checker/config.yml
#   ./health_checker.sh --endpoints "https://example.com,https://api.example.com"
#   ./health_checker.sh --help
###############################################################################

readonly SCRIPT_NAME="$(basename "$0")"
readonly HOSTNAME="$(hostname -f 2>/dev/null || hostname)"
readonly LOG_TAG="health_checker"

# Defaults
ENDPOINTS=""
CONFIG_FILE=""
DISK_THRESHOLD=85
MEMORY_THRESHOLD=90
CPU_THRESHOLD=80
SNS_TOPIC_ARN=""
SNS_REGION="us-east-1"
HTTP_TIMEOUT=10
VERBOSE=false
CHECK_DISK=true
CHECK_MEMORY=true
CHECK_CPU=true
CHECK_ENDPOINTS=true

ALERT_MESSAGES=()
ALERT_COUNT=0

usage() {
    cat <<EOF
Usage: ${SCRIPT_NAME} [OPTIONS]

Check service health, system resources, and send alerts via SNS.

Options:
  -e, --endpoints URLS       Comma-separated list of HTTP(S) endpoints to check
  -c, --config FILE          Config file (YAML) with endpoints and thresholds
  -D, --disk-threshold PCT   Disk usage alert threshold (default: 85%)
  -M, --memory-threshold PCT Memory usage alert threshold (default: 90%)
  -C, --cpu-threshold PCT    CPU load alert threshold (default: 80%)
  -s, --sns-topic ARN        SNS topic ARN for alerts
  -r, --sns-region REGION    AWS region for SNS (default: us-east-1)
  -t, --http-timeout SECS    HTTP request timeout (default: 10s)
      --skip-disk            Skip disk space checks
      --skip-memory          Skip memory checks
      --skip-cpu             Skip CPU load checks
      --skip-endpoints       Skip endpoint checks
  -v, --verbose              Enable verbose output
  -h, --help                 Show this help message

Examples:
  ${SCRIPT_NAME} -e "https://example.com,https://api.example.com" -s arn:aws:sns:us-east-1:123456789:alerts
  ${SCRIPT_NAME} --disk-threshold 90 --memory-threshold 95
EOF
    exit 0
}

log_info() {
    logger -t "${LOG_TAG}" -p local0.info "$*" 2>/dev/null || true
    echo "[INFO]  $(date '+%Y-%m-%d %H:%M:%S') $*"
}

log_warn() {
    logger -t "${LOG_TAG}" -p local0.warning "$*" 2>/dev/null || true
    echo "[WARN]  $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

log_error() {
    logger -t "${LOG_TAG}" -p local0.err "$*" 2>/dev/null || true
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

log_debug() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo "[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') $*"
    fi
}

add_alert() {
    local severity="$1"
    local message="$2"
    ALERT_MESSAGES+=("[${severity}] ${message}")
    ALERT_COUNT=$((ALERT_COUNT + 1))
    if [[ "${severity}" == "CRITICAL" ]]; then
        log_error "${message}"
    else
        log_warn "${message}"
    fi
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--endpoints)
                ENDPOINTS="$2"; shift 2 ;;
            -c|--config)
                CONFIG_FILE="$2"; shift 2 ;;
            -D|--disk-threshold)
                DISK_THRESHOLD="$2"; shift 2 ;;
            -M|--memory-threshold)
                MEMORY_THRESHOLD="$2"; shift 2 ;;
            -C|--cpu-threshold)
                CPU_THRESHOLD="$2"; shift 2 ;;
            -s|--sns-topic)
                SNS_TOPIC_ARN="$2"; shift 2 ;;
            -r|--sns-region)
                SNS_REGION="$2"; shift 2 ;;
            -t|--http-timeout)
                HTTP_TIMEOUT="$2"; shift 2 ;;
            --skip-disk)
                CHECK_DISK=false; shift ;;
            --skip-memory)
                CHECK_MEMORY=false; shift ;;
            --skip-cpu)
                CHECK_CPU=false; shift ;;
            --skip-endpoints)
                CHECK_ENDPOINTS=false; shift ;;
            -v|--verbose)
                VERBOSE=true; shift ;;
            -h|--help)
                usage ;;
            *)
                log_error "Unknown option: $1"
                usage ;;
        esac
    done
}

check_endpoints() {
    if [[ "${CHECK_ENDPOINTS}" != "true" ]] || [[ -z "${ENDPOINTS}" ]]; then
        log_debug "Skipping endpoint checks"
        return
    fi

    log_info "Checking service endpoints..."

    IFS=',' read -ra endpoint_list <<< "${ENDPOINTS}"
    for endpoint in "${endpoint_list[@]}"; do
        endpoint="$(echo "${endpoint}" | xargs)"
        log_debug "Checking endpoint: ${endpoint}"

        local http_code
        local response_time
        local curl_output

        curl_output="$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" \
            --connect-timeout "${HTTP_TIMEOUT}" \
            --max-time "$((HTTP_TIMEOUT * 2))" \
            "${endpoint}" 2>/dev/null)" || true

        http_code="$(echo "${curl_output}" | cut -d'|' -f1)"
        response_time="$(echo "${curl_output}" | cut -d'|' -f2)"

        if [[ -z "${http_code}" ]] || [[ "${http_code}" == "000" ]]; then
            add_alert "CRITICAL" "Endpoint unreachable: ${endpoint} (connection failed)"
        elif [[ "${http_code}" -ge 500 ]]; then
            add_alert "CRITICAL" "Endpoint error: ${endpoint} (HTTP ${http_code}, ${response_time}s)"
        elif [[ "${http_code}" -ge 400 ]]; then
            add_alert "WARNING" "Endpoint client error: ${endpoint} (HTTP ${http_code}, ${response_time}s)"
        else
            log_info "Endpoint OK: ${endpoint} (HTTP ${http_code}, ${response_time}s)"
        fi
    done
}

check_disk_space() {
    if [[ "${CHECK_DISK}" != "true" ]]; then
        log_debug "Skipping disk space checks"
        return
    fi

    log_info "Checking disk space (threshold: ${DISK_THRESHOLD}%)..."

    while read -r filesystem size used avail pct mountpoint; do
        local usage="${pct%\%}"
        if [[ "${usage}" -ge "${DISK_THRESHOLD}" ]]; then
            add_alert "WARNING" "Disk space critical: ${mountpoint} at ${pct} (${avail} available) on ${HOSTNAME}"
        else
            log_debug "Disk OK: ${mountpoint} at ${pct}"
        fi
    done < <(df -h --output=source,size,used,avail,pcent,target -x tmpfs -x devtmpfs 2>/dev/null | tail -n +2)
}

check_memory() {
    if [[ "${CHECK_MEMORY}" != "true" ]]; then
        log_debug "Skipping memory checks"
        return
    fi

    log_info "Checking memory usage (threshold: ${MEMORY_THRESHOLD}%)..."

    local mem_total mem_available mem_used_pct
    mem_total="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
    mem_available="$(awk '/MemAvailable/ {print $2}' /proc/meminfo)"

    if [[ "${mem_total}" -gt 0 ]]; then
        mem_used_pct=$(( (mem_total - mem_available) * 100 / mem_total ))

        local mem_total_mb=$((mem_total / 1024))
        local mem_available_mb=$((mem_available / 1024))

        if [[ "${mem_used_pct}" -ge "${MEMORY_THRESHOLD}" ]]; then
            add_alert "WARNING" "Memory usage high: ${mem_used_pct}% used (${mem_available_mb}MB available of ${mem_total_mb}MB) on ${HOSTNAME}"
        else
            log_info "Memory OK: ${mem_used_pct}% used (${mem_available_mb}MB available of ${mem_total_mb}MB)"
        fi
    fi
}

check_cpu_load() {
    if [[ "${CHECK_CPU}" != "true" ]]; then
        log_debug "Skipping CPU load checks"
        return
    fi

    log_info "Checking CPU load (threshold: ${CPU_THRESHOLD}%)..."

    local cpu_count load_1 load_5 load_15
    cpu_count="$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo)"
    read -r load_1 load_5 load_15 _ < /proc/loadavg

    local load_pct
    load_pct="$(awk "BEGIN {printf \"%.0f\", (${load_5} / ${cpu_count}) * 100}")"

    if [[ "${load_pct}" -ge "${CPU_THRESHOLD}" ]]; then
        add_alert "WARNING" "CPU load high: ${load_pct}% (load avg: ${load_1}, ${load_5}, ${load_15}, cores: ${cpu_count}) on ${HOSTNAME}"
    else
        log_info "CPU OK: ${load_pct}% (load avg: ${load_1}, ${load_5}, ${load_15}, cores: ${cpu_count})"
    fi
}

send_sns_alert() {
    if [[ "${ALERT_COUNT}" -eq 0 ]]; then
        log_info "No alerts to send"
        return
    fi

    if [[ -z "${SNS_TOPIC_ARN}" ]]; then
        log_warn "No SNS topic ARN configured. ${ALERT_COUNT} alert(s) not sent."
        log_warn "Alert summary:"
        for msg in "${ALERT_MESSAGES[@]}"; do
            log_warn "  ${msg}"
        done
        return
    fi

    if ! command -v aws &>/dev/null; then
        log_error "AWS CLI not found. Cannot send SNS alerts."
        return 1
    fi

    local subject="Health Check Alert: ${HOSTNAME} - ${ALERT_COUNT} issue(s)"
    local body
    body="Health Check Report - ${HOSTNAME}\n"
    body+="Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')\n"
    body+="Total Alerts: ${ALERT_COUNT}\n\n"
    for msg in "${ALERT_MESSAGES[@]}"; do
        body+="${msg}\n"
    done

    log_info "Sending ${ALERT_COUNT} alert(s) via SNS..."

    if aws sns publish \
        --topic-arn "${SNS_TOPIC_ARN}" \
        --subject "${subject}" \
        --message "$(echo -e "${body}")" \
        --region "${SNS_REGION}" \
        --output text >/dev/null 2>&1; then
        log_info "SNS alert sent successfully"
    else
        log_error "Failed to send SNS alert"
    fi
}

print_summary() {
    echo ""
    echo "============================================="
    echo "  Health Check Summary - ${HOSTNAME}"
    echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "============================================="

    if [[ "${ALERT_COUNT}" -eq 0 ]]; then
        echo "  Status: ALL CHECKS PASSED"
    else
        echo "  Status: ${ALERT_COUNT} ALERT(S) DETECTED"
        echo ""
        for msg in "${ALERT_MESSAGES[@]}"; do
            echo "  * ${msg}"
        done
    fi

    echo "============================================="
    echo ""
}

main() {
    parse_args "$@"

    log_info "=== Health Check Started on ${HOSTNAME} ==="

    check_endpoints
    check_disk_space
    check_memory
    check_cpu_load

    print_summary
    send_sns_alert

    log_info "=== Health Check Complete ==="

    if [[ "${ALERT_COUNT}" -gt 0 ]]; then
        exit 1
    fi
}

main "$@"
