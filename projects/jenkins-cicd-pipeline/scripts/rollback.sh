#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# rollback.sh — Revert an ECS service to its previous task
#                definition revision
# ============================================================

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
die() { log "FATAL: $*" >&2; exit 1; }

usage() {
    cat <<EOF
Usage: $(basename "$0") --cluster CLUSTER --service SERVICE [--region REGION] [--revision REVISION]

Required:
  --cluster    ECS cluster name
  --service    ECS service name

Optional:
  --region     AWS region (default: us-east-1)
  --revision   Explicit task-definition ARN to roll back to.
               If omitted, the script picks the previous revision automatically.
  --help       Show this help
EOF
    exit 1
}

# -----------------------------------------------------------
# Parse arguments
# -----------------------------------------------------------
CLUSTER=""
SERVICE=""
REGION="us-east-1"
TARGET_REVISION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --cluster)   CLUSTER="$2";         shift 2 ;;
        --service)   SERVICE="$2";         shift 2 ;;
        --region)    REGION="$2";          shift 2 ;;
        --revision)  TARGET_REVISION="$2"; shift 2 ;;
        --help|-h)   usage ;;
        *)           die "Unknown argument: $1" ;;
    esac
done

[[ -n "${CLUSTER}" ]] || die "Missing --cluster"
[[ -n "${SERVICE}" ]] || die "Missing --service"

export AWS_DEFAULT_REGION="${REGION}"

# -----------------------------------------------------------
# Step 1: Determine rollback target
# -----------------------------------------------------------
log "Fetching current task definition for service ${SERVICE}..."

CURRENT_ARN=$(aws ecs describe-services \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" \
    --query 'services[0].taskDefinition' \
    --output text) || die "Could not describe service"

log "Current task definition: ${CURRENT_ARN}"

if [[ -n "${TARGET_REVISION}" ]]; then
    ROLLBACK_ARN="${TARGET_REVISION}"
    log "Using explicit rollback target: ${ROLLBACK_ARN}"
else
    FAMILY=$(echo "${CURRENT_ARN}" | sed 's/:/ /g' | awk '{print $(NF-1)}')
    CURRENT_REV=$(echo "${CURRENT_ARN}" | awk -F: '{print $NF}')

    if [[ "${CURRENT_REV}" -le 1 ]]; then
        die "No previous revision available (current revision is ${CURRENT_REV})"
    fi

    PREV_REV=$((CURRENT_REV - 1))

    ROLLBACK_ARN=$(aws ecs describe-task-definition \
        --task-definition "${FAMILY}:${PREV_REV}" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text 2>/dev/null) || die "Previous revision ${FAMILY}:${PREV_REV} not found"

    log "Rolling back to previous revision: ${ROLLBACK_ARN}"
fi

# -----------------------------------------------------------
# Step 2: Verify the target task definition exists
# -----------------------------------------------------------
log "Verifying rollback target..."

ROLLBACK_STATUS=$(aws ecs describe-task-definition \
    --task-definition "${ROLLBACK_ARN}" \
    --query 'taskDefinition.status' \
    --output text) || die "Rollback target ${ROLLBACK_ARN} does not exist"

if [[ "${ROLLBACK_STATUS}" != "ACTIVE" ]]; then
    die "Rollback target is not ACTIVE (status: ${ROLLBACK_STATUS})"
fi

ROLLBACK_IMAGE=$(aws ecs describe-task-definition \
    --task-definition "${ROLLBACK_ARN}" \
    --query 'taskDefinition.containerDefinitions[0].image' \
    --output text)

log "Rollback image: ${ROLLBACK_IMAGE}"

# -----------------------------------------------------------
# Step 3: Update the service to the rollback revision
# -----------------------------------------------------------
log "Updating service ${SERVICE} to ${ROLLBACK_ARN}..."

aws ecs update-service \
    --cluster "${CLUSTER}" \
    --service "${SERVICE}" \
    --task-definition "${ROLLBACK_ARN}" \
    --force-new-deployment \
    --query 'service.serviceName' \
    --output text || die "Failed to update service for rollback"

# -----------------------------------------------------------
# Step 4: Wait for rollback to stabilize
# -----------------------------------------------------------
log "Waiting for service to stabilize..."

if aws ecs wait services-stable \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" 2>/dev/null; then
    log "Service ${SERVICE} is stable after rollback."
else
    die "Service did not stabilize after rollback"
fi

log "=== Rollback complete ==="
log "Cluster: ${CLUSTER}  Service: ${SERVICE}"
log "Rolled back from: ${CURRENT_ARN}"
log "Rolled back to:   ${ROLLBACK_ARN}"
log "Image:            ${ROLLBACK_IMAGE}"
