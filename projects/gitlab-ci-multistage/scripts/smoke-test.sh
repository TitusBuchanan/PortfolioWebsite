#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# smoke-test.sh — Post-deployment smoke tests
#
# Checks health, readiness, and critical API endpoints after
# a deployment to verify the service is operational.
# ============================================================

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
die() { log "FATAL: $*" >&2; exit 1; }

usage() {
    cat <<EOF
Usage: $(basename "$0") --url BASE_URL [OPTIONS]

Required:
  --url         Base URL of the deployed service (e.g., https://staging.example.com)

Optional:
  --retries     Number of retry attempts for each check (default: 5)
  --delay       Delay in seconds between retries (default: 10)
  --timeout     HTTP request timeout in seconds (default: 10)
  --token       Bearer token for authenticated endpoints
  --help        Show this help
EOF
    exit 1
}

# -----------------------------------------------------------
# Defaults
# -----------------------------------------------------------
BASE_URL=""
RETRIES=5
DELAY=10
HTTP_TIMEOUT=10
AUTH_TOKEN=""
FAILURES=0
TOTAL_CHECKS=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --url)      BASE_URL="$2";    shift 2 ;;
        --retries)  RETRIES="$2";     shift 2 ;;
        --delay)    DELAY="$2";       shift 2 ;;
        --timeout)  HTTP_TIMEOUT="$2"; shift 2 ;;
        --token)    AUTH_TOKEN="$2";  shift 2 ;;
        --help|-h)  usage ;;
        *)          die "Unknown argument: $1" ;;
    esac
done

[[ -n "${BASE_URL}" ]] || die "Missing --url"

BASE_URL="${BASE_URL%/}"

# -----------------------------------------------------------
# HTTP helper with retries
# -----------------------------------------------------------
http_check() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local body_contains="${4:-}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "CHECK [${name}]: ${url} (expect ${expected_status})"

    local auth_header=""
    if [[ -n "${AUTH_TOKEN}" ]]; then
        auth_header="-H 'Authorization: Bearer ${AUTH_TOKEN}'"
    fi

    local attempt=1
    while [[ ${attempt} -le ${RETRIES} ]]; do
        local http_code body
        body=$(mktemp)

        http_code=$(eval curl -s -o "${body}" -w '%{http_code}' \
            --max-time "${HTTP_TIMEOUT}" \
            --connect-timeout 5 \
            ${auth_header} \
            "'${url}'" 2>/dev/null) || http_code="000"

        if [[ "${http_code}" == "${expected_status}" ]]; then
            if [[ -n "${body_contains}" ]]; then
                if grep -q "${body_contains}" "${body}" 2>/dev/null; then
                    log "  PASS [${name}] (attempt ${attempt}/${RETRIES}) — status ${http_code}, body contains '${body_contains}'"
                    rm -f "${body}"
                    return 0
                else
                    log "  RETRY [${name}] (attempt ${attempt}/${RETRIES}) — status ${http_code} but body missing '${body_contains}'"
                fi
            else
                log "  PASS [${name}] (attempt ${attempt}/${RETRIES}) — status ${http_code}"
                rm -f "${body}"
                return 0
            fi
        else
            log "  RETRY [${name}] (attempt ${attempt}/${RETRIES}) — got ${http_code}, expected ${expected_status}"
        fi

        rm -f "${body}"
        attempt=$((attempt + 1))

        if [[ ${attempt} -le ${RETRIES} ]]; then
            sleep "${DELAY}"
        fi
    done

    log "  FAIL [${name}] — exhausted ${RETRIES} retries"
    FAILURES=$((FAILURES + 1))
    return 1
}

# -----------------------------------------------------------
# Smoke test suite
# -----------------------------------------------------------
run_smoke_tests() {
    log "=== Smoke Test Suite ==="
    log "Target:  ${BASE_URL}"
    log "Retries: ${RETRIES}  Delay: ${DELAY}s  Timeout: ${HTTP_TIMEOUT}s"
    log ""

    http_check \
        "health" \
        "${BASE_URL}/health" \
        "200" \
        "" || true

    http_check \
        "readiness" \
        "${BASE_URL}/ready" \
        "200" \
        "" || true

    http_check \
        "api-root" \
        "${BASE_URL}/api/v1/" \
        "200" \
        "" || true

    http_check \
        "openapi-docs" \
        "${BASE_URL}/docs" \
        "200" \
        "swagger" || true

    http_check \
        "openapi-schema" \
        "${BASE_URL}/openapi.json" \
        "200" \
        "openapi" || true

    http_check \
        "metrics" \
        "${BASE_URL}/metrics" \
        "200" \
        "" || true

    http_check \
        "not-found-returns-404" \
        "${BASE_URL}/this-path-should-not-exist-$(date +%s)" \
        "404" \
        "" || true
}

# -----------------------------------------------------------
# Summary
# -----------------------------------------------------------
summarize() {
    log ""
    log "=== Smoke Test Results ==="
    log "Total checks: ${TOTAL_CHECKS}"
    log "Passed:       $((TOTAL_CHECKS - FAILURES))"
    log "Failed:       ${FAILURES}"

    if [[ ${FAILURES} -gt 0 ]]; then
        die "${FAILURES} smoke test(s) failed — deployment may be unhealthy"
    fi

    log "All smoke tests passed."
}

# -----------------------------------------------------------
# Main
# -----------------------------------------------------------
main() {
    run_smoke_tests
    summarize
}

main "$@"
