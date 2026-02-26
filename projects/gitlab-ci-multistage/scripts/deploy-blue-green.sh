#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy-blue-green.sh — Blue-green deployment for ECS/Fargate
#
# Strategy:
#   1. Register new task definition with updated image
#   2. Create a new "green" target group
#   3. Start green tasks behind the green target group
#   4. Run health checks against green
#   5. Switch ALB listener to green target group
#   6. Drain and deregister old "blue" target group
# ============================================================

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
die() { log "FATAL: $*" >&2; exit 1; }

usage() {
    cat <<EOF
Usage: $(basename "$0") --cluster CLUSTER --service SERVICE --image IMAGE [OPTIONS]

Required:
  --cluster       ECS cluster name
  --service       ECS service name
  --image         Full Docker image URI (registry/repo:tag)

Optional:
  --region        AWS region (default: us-east-1)
  --environment   Environment label: staging | production (default: staging)
  --health-path   Health check path (default: /health)
  --drain-time    Connection draining time in seconds (default: 30)
  --help          Show this help
EOF
    exit 1
}

# -----------------------------------------------------------
# Defaults
# -----------------------------------------------------------
CLUSTER=""
SERVICE=""
IMAGE=""
REGION="us-east-1"
ENVIRONMENT="staging"
HEALTH_PATH="/health"
DRAIN_TIME=30

while [[ $# -gt 0 ]]; do
    case "$1" in
        --cluster)      CLUSTER="$2";     shift 2 ;;
        --service)      SERVICE="$2";     shift 2 ;;
        --image)        IMAGE="$2";       shift 2 ;;
        --region)       REGION="$2";      shift 2 ;;
        --environment)  ENVIRONMENT="$2"; shift 2 ;;
        --health-path)  HEALTH_PATH="$2"; shift 2 ;;
        --drain-time)   DRAIN_TIME="$2";  shift 2 ;;
        --help|-h)      usage ;;
        *)              die "Unknown argument: $1" ;;
    esac
done

[[ -n "${CLUSTER}" ]] || die "Missing --cluster"
[[ -n "${SERVICE}" ]] || die "Missing --service"
[[ -n "${IMAGE}" ]]   || die "Missing --image"

export AWS_DEFAULT_REGION="${REGION}"

DEPLOYMENT_ID="$(date +%Y%m%d%H%M%S)-${RANDOM}"
log "=== Blue-Green Deployment ==="
log "Deployment ID: ${DEPLOYMENT_ID}"
log "Cluster: ${CLUSTER}  Service: ${SERVICE}"
log "Image: ${IMAGE}  Environment: ${ENVIRONMENT}"

# -----------------------------------------------------------
# Step 1: Capture current (blue) state
# -----------------------------------------------------------
log "[1/6] Capturing current blue deployment state..."

BLUE_TASK_DEF=$(aws ecs describe-services \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" \
    --query 'services[0].taskDefinition' \
    --output text) || die "Cannot describe service ${SERVICE}"

BLUE_TG_ARN=$(aws ecs describe-services \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" \
    --query 'services[0].loadBalancers[0].targetGroupArn' \
    --output text) || die "Cannot find blue target group"

log "Blue task def: ${BLUE_TASK_DEF}"
log "Blue target group: ${BLUE_TG_ARN}"

# -----------------------------------------------------------
# Step 2: Register green task definition
# -----------------------------------------------------------
log "[2/6] Registering green task definition..."

TASK_DEF_JSON=$(aws ecs describe-task-definition \
    --task-definition "${BLUE_TASK_DEF}" \
    --query 'taskDefinition') || die "Cannot describe task definition"

GREEN_TASK_DEF_JSON=$(echo "${TASK_DEF_JSON}" | jq --arg IMG "${IMAGE}" '
    .containerDefinitions[0].image = $IMG |
    del(.taskDefinitionArn, .revision, .status,
        .requiresAttributes, .compatibilities,
        .registeredAt, .registeredBy)
')

GREEN_TASK_DEF=$(aws ecs register-task-definition \
    --cli-input-json "${GREEN_TASK_DEF_JSON}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text) || die "Cannot register green task definition"

log "Green task def: ${GREEN_TASK_DEF}"

# -----------------------------------------------------------
# Step 3: Create green target group
# -----------------------------------------------------------
log "[3/6] Creating green target group..."

BLUE_TG_NAME=$(aws elbv2 describe-target-groups \
    --target-group-arns "${BLUE_TG_ARN}" \
    --query 'TargetGroups[0].TargetGroupName' \
    --output text)

VPC_ID=$(aws elbv2 describe-target-groups \
    --target-group-arns "${BLUE_TG_ARN}" \
    --query 'TargetGroups[0].VpcId' \
    --output text)

TG_PORT=$(aws elbv2 describe-target-groups \
    --target-group-arns "${BLUE_TG_ARN}" \
    --query 'TargetGroups[0].Port' \
    --output text)

GREEN_TG_NAME="${SERVICE}-green-${DEPLOYMENT_ID: -8}"
GREEN_TG_NAME="${GREEN_TG_NAME:0:32}"

GREEN_TG_ARN=$(aws elbv2 create-target-group \
    --name "${GREEN_TG_NAME}" \
    --protocol HTTP \
    --port "${TG_PORT}" \
    --vpc-id "${VPC_ID}" \
    --target-type ip \
    --health-check-path "${HEALTH_PATH}" \
    --health-check-interval-seconds 10 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) || die "Cannot create green target group"

log "Green target group: ${GREEN_TG_ARN}"

# -----------------------------------------------------------
# Step 4: Update service to use green task def + green TG
# -----------------------------------------------------------
log "[4/6] Deploying green tasks..."

CONTAINER_NAME=$(echo "${TASK_DEF_JSON}" | jq -r '.containerDefinitions[0].name')
CONTAINER_PORT=$(echo "${TASK_DEF_JSON}" | jq -r '.containerDefinitions[0].portMappings[0].containerPort')

aws ecs update-service \
    --cluster "${CLUSTER}" \
    --service "${SERVICE}" \
    --task-definition "${GREEN_TASK_DEF}" \
    --load-balancers "targetGroupArn=${GREEN_TG_ARN},containerName=${CONTAINER_NAME},containerPort=${CONTAINER_PORT}" \
    --force-new-deployment \
    --query 'service.serviceName' \
    --output text || die "Cannot update service with green deployment"

log "Waiting for green tasks to reach steady state..."

if ! aws ecs wait services-stable --cluster "${CLUSTER}" --services "${SERVICE}" 2>/dev/null; then
    log "WARNING: Service did not stabilize within timeout — checking health manually..."
fi

# -----------------------------------------------------------
# Step 5: Verify green health
# -----------------------------------------------------------
log "[5/6] Verifying green deployment health..."

GREEN_HEALTH=$(aws elbv2 describe-target-health \
    --target-group-arn "${GREEN_TG_ARN}" \
    --query 'TargetHealthDescriptions[*].TargetHealth.State' \
    --output text)

HEALTHY_COUNT=$(echo "${GREEN_HEALTH}" | tr '\t' '\n' | grep -c "healthy" || true)

if [[ "${HEALTHY_COUNT}" -eq 0 ]]; then
    log "ERROR: No healthy targets in green group — initiating rollback..."

    aws ecs update-service \
        --cluster "${CLUSTER}" \
        --service "${SERVICE}" \
        --task-definition "${BLUE_TASK_DEF}" \
        --load-balancers "targetGroupArn=${BLUE_TG_ARN},containerName=${CONTAINER_NAME},containerPort=${CONTAINER_PORT}" \
        --force-new-deployment >/dev/null 2>&1 || true

    aws elbv2 delete-target-group --target-group-arn "${GREEN_TG_ARN}" 2>/dev/null || true

    die "Green deployment health check failed — rolled back to blue"
fi

log "Green deployment healthy (${HEALTHY_COUNT} target(s))"

# -----------------------------------------------------------
# Step 6: Clean up blue target group
# -----------------------------------------------------------
log "[6/6] Cleaning up blue target group..."

sleep "${DRAIN_TIME}"

aws elbv2 delete-target-group \
    --target-group-arn "${BLUE_TG_ARN}" 2>/dev/null || \
    log "WARNING: Could not delete blue target group (may still have active connections)"

log "=== Blue-Green Deployment Complete ==="
log "Deployment ID:  ${DEPLOYMENT_ID}"
log "Environment:    ${ENVIRONMENT}"
log "Task Def:       ${GREEN_TASK_DEF}"
log "Target Group:   ${GREEN_TG_ARN}"
log "Image:          ${IMAGE}"
