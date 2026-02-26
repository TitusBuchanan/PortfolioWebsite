.PHONY: help build test lint docker-build docker-push deploy-staging deploy-prod rollback dev clean

APP_NAME    ?= jenkins-cicd-app
DOCKER_TAG  ?= $(shell git rev-parse --short=8 HEAD 2>/dev/null || echo latest)
ECR_REGISTRY ?= 123456789012.dkr.ecr.us-east-1.amazonaws.com
IMAGE        = $(ECR_REGISTRY)/$(APP_NAME)
AWS_REGION  ?= us-east-1
ECS_CLUSTER ?= production-cluster

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# -----------------------------------------------------------
# Local development
# -----------------------------------------------------------

dev: ## Start local dev environment with docker-compose
	docker compose up --build

dev-down: ## Stop local dev environment
	docker compose down -v

install: ## Install npm dependencies
	npm ci

# -----------------------------------------------------------
# Quality gates
# -----------------------------------------------------------

lint: ## Run linter
	npm run lint

test: ## Run all tests
	npm run test:unit -- --coverage

test-integration: ## Run integration tests (requires running services)
	npm run test:integration

# -----------------------------------------------------------
# Build
# -----------------------------------------------------------

build: lint test docker-build ## Full build: lint, test, docker build

docker-build: ## Build Docker production image
	docker build \
		--target production \
		--tag $(APP_NAME):$(DOCKER_TAG) \
		--tag $(APP_NAME):latest \
		.

docker-push: ## Push image to ECR
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(ECR_REGISTRY)
	docker tag $(APP_NAME):$(DOCKER_TAG) $(IMAGE):$(DOCKER_TAG)
	docker tag $(APP_NAME):$(DOCKER_TAG) $(IMAGE):latest
	docker push $(IMAGE):$(DOCKER_TAG)
	docker push $(IMAGE):latest

# -----------------------------------------------------------
# Deployment
# -----------------------------------------------------------

deploy-staging: ## Deploy to staging
	./scripts/deploy.sh \
		--cluster $(ECS_CLUSTER) \
		--service $(APP_NAME)-staging \
		--image $(IMAGE):$(DOCKER_TAG) \
		--region $(AWS_REGION)

deploy-prod: ## Deploy to production (requires prior staging deploy)
	@echo "⚠️  Deploying to PRODUCTION — $(IMAGE):$(DOCKER_TAG)"
	@read -r -p "Continue? [y/N] " confirm && [ "$$confirm" = y ] || exit 1
	./scripts/deploy.sh \
		--cluster $(ECS_CLUSTER) \
		--service $(APP_NAME)-production \
		--image $(IMAGE):$(DOCKER_TAG) \
		--region $(AWS_REGION)

rollback: ## Rollback production to previous revision
	@echo "⚠️  Rolling back PRODUCTION"
	@read -r -p "Continue? [y/N] " confirm && [ "$$confirm" = y ] || exit 1
	./scripts/rollback.sh \
		--cluster $(ECS_CLUSTER) \
		--service $(APP_NAME)-production \
		--region $(AWS_REGION)

# -----------------------------------------------------------
# Housekeeping
# -----------------------------------------------------------

clean: ## Remove build artifacts and stopped containers
	rm -rf dist coverage node_modules/.cache
	docker compose down -v --remove-orphans 2>/dev/null || true
	docker image prune -f
