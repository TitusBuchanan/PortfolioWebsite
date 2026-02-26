#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Log Rotator
#
# Rotates, compresses, and archives application logs. Supports local cleanup
# and optional archival to S3.
#
# Usage:
#   ./log_rotator.sh --log-dir /var/log/myapp --retention 30
#   ./log_rotator.sh --log-dir /var/log/myapp --s3-bucket my-logs-bucket
#   ./log_rotator.sh --help
###############################################################################

readonly SCRIPT_NAME="$(basename "$0")"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly LOG_TAG="log_rotator"

# Defaults
LOG_DIR=""
RETENTION_DAYS=30
S3_BUCKET=""
S3_PREFIX="logs/archive"
PATTERN="*.log"
COMPRESS_ALGO="gzip"
DRY_RUN=false
VERBOSE=false

usage() {
    cat <<EOF
Usage: ${SCRIPT_NAME} [OPTIONS]

Rotate, compress, and optionally archive logs to S3.

Options:
  -d, --log-dir DIR        Directory containing log files (required)
  -r, --retention DAYS     Retention period in days (default: 30)
  -b, --s3-bucket BUCKET   S3 bucket for archival (optional)
  -p, --s3-prefix PREFIX   S3 key prefix (default: logs/archive)
  -f, --pattern PATTERN    File glob pattern (default: *.log)
  -c, --compress ALGO      Compression: gzip|bzip2|xz (default: gzip)
  -n, --dry-run            Show what would be done without executing
  -v, --verbose            Enable verbose output
  -h, --help               Show this help message

Examples:
  ${SCRIPT_NAME} --log-dir /var/log/nginx --retention 14
  ${SCRIPT_NAME} --log-dir /var/log/app --s3-bucket my-logs --compress bzip2
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

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -d|--log-dir)
                LOG_DIR="$2"; shift 2 ;;
            -r|--retention)
                RETENTION_DAYS="$2"; shift 2 ;;
            -b|--s3-bucket)
                S3_BUCKET="$2"; shift 2 ;;
            -p|--s3-prefix)
                S3_PREFIX="$2"; shift 2 ;;
            -f|--pattern)
                PATTERN="$2"; shift 2 ;;
            -c|--compress)
                COMPRESS_ALGO="$2"; shift 2 ;;
            -n|--dry-run)
                DRY_RUN=true; shift ;;
            -v|--verbose)
                VERBOSE=true; shift ;;
            -h|--help)
                usage ;;
            *)
                log_error "Unknown option: $1"
                usage ;;
        esac
    done

    if [[ -z "${LOG_DIR}" ]]; then
        log_error "--log-dir is required"
        exit 1
    fi

    if [[ ! -d "${LOG_DIR}" ]]; then
        log_error "Log directory does not exist: ${LOG_DIR}"
        exit 1
    fi

    case "${COMPRESS_ALGO}" in
        gzip|bzip2|xz) ;;
        *)
            log_error "Unsupported compression algorithm: ${COMPRESS_ALGO}"
            exit 1 ;;
    esac
}

get_compress_ext() {
    case "${COMPRESS_ALGO}" in
        gzip)  echo "gz" ;;
        bzip2) echo "bz2" ;;
        xz)    echo "xz" ;;
    esac
}

compress_logs() {
    local ext
    ext="$(get_compress_ext)"
    local count=0

    log_info "Compressing logs older than 1 day in ${LOG_DIR} (pattern: ${PATTERN})"

    while IFS= read -r -d '' file; do
        local compressed="${file}.${ext}"
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY RUN] Would compress: ${file} -> ${compressed}"
        else
            log_debug "Compressing: ${file}"
            ${COMPRESS_ALGO} -f "${file}"
            count=$((count + 1))
        fi
    done < <(find "${LOG_DIR}" -name "${PATTERN}" -type f -mtime +0 -print0 2>/dev/null)

    log_info "Compressed ${count} log files"
}

archive_to_s3() {
    if [[ -z "${S3_BUCKET}" ]]; then
        log_debug "No S3 bucket specified, skipping archival"
        return
    fi

    if ! command -v aws &>/dev/null; then
        log_error "AWS CLI not found. Install it to enable S3 archival."
        return 1
    fi

    local ext
    ext="$(get_compress_ext)"
    local count=0
    local s3_dest="s3://${S3_BUCKET}/${S3_PREFIX}/$(date +%Y/%m/%d)"

    log_info "Archiving compressed logs to ${s3_dest}"

    while IFS= read -r -d '' file; do
        local basename
        basename="$(basename "${file}")"
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY RUN] Would upload: ${file} -> ${s3_dest}/${basename}"
        else
            log_debug "Uploading: ${file} -> ${s3_dest}/${basename}"
            if aws s3 cp "${file}" "${s3_dest}/${basename}" --quiet; then
                count=$((count + 1))
            else
                log_warn "Failed to upload: ${file}"
            fi
        fi
    done < <(find "${LOG_DIR}" -name "*.${ext}" -type f -print0 2>/dev/null)

    log_info "Archived ${count} files to S3"
}

cleanup_old_logs() {
    local ext
    ext="$(get_compress_ext)"
    local count=0

    log_info "Cleaning up logs older than ${RETENTION_DAYS} days"

    while IFS= read -r -d '' file; do
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY RUN] Would delete: ${file}"
        else
            log_debug "Deleting: ${file}"
            rm -f "${file}"
            count=$((count + 1))
        fi
    done < <(find "${LOG_DIR}" \( -name "*.${ext}" -o -name "${PATTERN}" \) -type f -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null)

    log_info "Deleted ${count} old log files"
}

report_disk_usage() {
    local usage
    usage="$(du -sh "${LOG_DIR}" 2>/dev/null | cut -f1)"
    log_info "Current disk usage for ${LOG_DIR}: ${usage}"
}

main() {
    parse_args "$@"

    log_info "=== Log Rotation Started ==="
    log_info "Directory: ${LOG_DIR}"
    log_info "Retention: ${RETENTION_DAYS} days"
    log_info "Compression: ${COMPRESS_ALGO}"
    [[ -n "${S3_BUCKET}" ]] && log_info "S3 Bucket: ${S3_BUCKET}/${S3_PREFIX}"
    [[ "${DRY_RUN}" == "true" ]] && log_info "*** DRY RUN MODE ***"

    report_disk_usage
    compress_logs
    archive_to_s3
    cleanup_old_logs
    report_disk_usage

    log_info "=== Log Rotation Complete ==="
}

main "$@"
