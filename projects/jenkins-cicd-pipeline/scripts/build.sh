#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# build.sh — Lint, test, and build the Docker image
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_NAME="${APP_NAME:-jenkins-cicd-app}"
DOCKER_TAG="${DOCKER_TAG:-$(git -C "${PROJECT_ROOT}" rev-parse --short=8 HEAD 2>/dev/null || echo 'latest')}"
IMAGE="${APP_NAME}:${DOCKER_TAG}"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
die() { log "FATAL: $*" >&2; exit 1; }

# -----------------------------------------------------------
# Step 1: Lint
# -----------------------------------------------------------
lint() {
    log "Running linter..."
    cd "${PROJECT_ROOT}"
    npm run lint || die "Lint failed"
    log "Lint passed."
}

# -----------------------------------------------------------
# Step 2: Unit tests
# -----------------------------------------------------------
unit_tests() {
    log "Running unit tests..."
    cd "${PROJECT_ROOT}"
    npm run test:unit -- --coverage || die "Unit tests failed"
    log "Unit tests passed."
}

# -----------------------------------------------------------
# Step 3: Build Docker image
# -----------------------------------------------------------
build_image() {
    log "Building Docker image ${IMAGE}..."
    cd "${PROJECT_ROOT}"

    docker build \
        --target production \
        --tag "${IMAGE}" \
        --tag "${APP_NAME}:latest" \
        --build-arg BUILD_DATE="$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="${DOCKER_TAG}" \
        --file Dockerfile \
        . || die "Docker build failed"

    log "Docker image built: ${IMAGE}"
}

# -----------------------------------------------------------
# Main
# -----------------------------------------------------------
main() {
    log "=== Build pipeline start ==="
    log "App: ${APP_NAME}  Tag: ${DOCKER_TAG}"

    lint
    unit_tests
    build_image

    log "=== Build pipeline complete ==="
    log "Image ready: ${IMAGE}"
}

main "$@"
