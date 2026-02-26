#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy.sh — Update an ECS service with a new task definition
# ============================================================

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
die() { log "FATAL: $*" >&2; exit 1; }

usage() {
    cat <<EOF
Usage: $(basename "$0") --cluster CLUSTER --service SERVICE --image IMAGE [--region REGION] [--timeout SECONDS]

Required:
  --cluster   ECS cluster name
  --service   ECS service name
  --image     Full Docker image URI (registry/repo:tag)

Optional:
  --region    AWS region (default: us-east-1)
  --timeout   Deployment timeout in seconds (default: 600)
  --help      Show this help
EOF
    exit 1
}

# -----------------------------------------------------------
# Parse arguments
# -----------------------------------------------------------
CLUSTER=""
SERVICE=""
IMAGE=""
REGION="us-east-1"
TIMEOUT=600

while [[ $# -gt 0 ]]; do
    case "$1" in
        --cluster)  CLUSTER="$2"; shift 2 ;;
        --service)  SERVICE="$2"; shift 2 ;;
        --image)    IMAGE="$2";   shift 2 ;;
        --region)   REGION="$2";  shift 2 ;;
        --timeout)  TIMEOUT="$2"; shift 2 ;;
        --help|-h)  usage ;;
        *)          die "Unknown argument: $1" ;;
    esac
done

[[ -n "${CLUSTER}" ]] || die "Missing --cluster"
[[ -n "${SERVICE}" ]] || die "Missing --service"
[[ -n "${IMAGE}" ]]   || die "Missing --image"

export AWS_DEFAULT_REGION="${REGION}"

# -----------------------------------------------------------
# Step 1: Retrieve the current task definition
# -----------------------------------------------------------
log "Fetching current task definition for service ${SERVICE}..."

TASK_DEF_ARN=$(aws ecs describe-services \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" \
    --query 'services[0].taskDefinition' \
    --output text) || die "Could not describe service ${SERVICE}"

log "Current task definition: ${TASK_DEF_ARN}"

# -----------------------------------------------------------
# Step 2: Build an updated task definition with the new image
# -----------------------------------------------------------
log "Creating new task definition with image ${IMAGE}..."

TASK_DEF_JSON=$(aws ecs describe-task-definition \
    --task-definition "${TASK_DEF_ARN}" \
    --query 'taskDefinition' \
    --output json) || die "Could not describe task definition"

NEW_TASK_DEF=$(echo "${TASK_DEF_JSON}" | \
    jq --arg IMG "${IMAGE}" '
        .containerDefinitions[0].image = $IMG |
        del(.taskDefinitionArn, .revision, .status,
            .requiresAttributes, .compatibilities,
            .registeredAt, .registeredBy)
    ') || die "Failed to build new task definition JSON"

NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json "${NEW_TASK_DEF}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text) || die "Failed to register new task definition"

log "Registered new task definition: ${NEW_TASK_DEF_ARN}"

# -----------------------------------------------------------
# Step 3: Update the service
# -----------------------------------------------------------
log "Updating service ${SERVICE} in cluster ${CLUSTER}..."

aws ecs update-service \
    --cluster "${CLUSTER}" \
    --service "${SERVICE}" \
    --task-definition "${NEW_TASK_DEF_ARN}" \
    --force-new-deployment \
    --query 'service.serviceName' \
    --output text || die "Failed to update service"

# -----------------------------------------------------------
# Step 4: Wait for deployment to stabilize
# -----------------------------------------------------------
log "Waiting up to ${TIMEOUT}s for service to stabilize..."

if aws ecs wait services-stable \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" 2>/dev/null; then
    log "Service ${SERVICE} is stable."
else
    RUNNING=$(aws ecs describe-services \
        --cluster "${CLUSTER}" \
        --services "${SERVICE}" \
        --query 'services[0].deployments[?status==`PRIMARY`].runningCount' \
        --output text)
    DESIRED=$(aws ecs describe-services \
        --cluster "${CLUSTER}" \
        --services "${SERVICE}" \
        --query 'services[0].deployments[?status==`PRIMARY`].desiredCount' \
        --output text)
    die "Service did not stabilize. Running: ${RUNNING}, Desired: ${DESIRED}"
fi

log "=== Deployment complete ==="
log "Cluster: ${CLUSTER}  Service: ${SERVICE}  Image: ${IMAGE}"
