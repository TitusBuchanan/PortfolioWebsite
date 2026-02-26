.PHONY: help install lint test test-integration build push scan deploy-staging deploy-prod smoke-test dev clean

APP_NAME     ?= gitlab-fastapi-app
DOCKER_TAG   ?= $(shell git rev-parse --short=8 HEAD 2>/dev/null || echo latest)
REGISTRY     ?= registry.gitlab.com/org/project
IMAGE        = $(REGISTRY)/$(APP_NAME)
AWS_REGION   ?= us-east-1
ECS_CLUSTER  ?= production-cluster

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# -----------------------------------------------------------
# Local development
# -----------------------------------------------------------

dev: ## Start local dev environment with docker-compose
	docker compose up --build

dev-down: ## Stop local dev environment
	docker compose down -v

install: ## Install Python dependencies
	pip install -r requirements.txt -r requirements-dev.txt

# -----------------------------------------------------------
# Quality gates
# -----------------------------------------------------------

lint: ## Run linter and type checker
	ruff check src/ tests/
	ruff format --check src/ tests/
	mypy src/ --ignore-missing-imports

test: ## Run unit tests with coverage
	pytest tests/unit/ -v --cov=src --cov-report=term-missing --cov-report=html:coverage-html

test-integration: ## Run integration tests (requires running services)
	pytest tests/integration/ -v

test-all: test test-integration ## Run all tests

# -----------------------------------------------------------
# Security
# -----------------------------------------------------------

scan: ## Run security scans on the built image
	./scripts/security-scan.sh --image $(IMAGE):$(DOCKER_TAG) --severity HIGH,CRITICAL --scan-fs

scan-deps: ## Scan Python dependencies for known vulnerabilities
	pip install safety bandit
	safety check
	bandit -r src/ -ll

# -----------------------------------------------------------
# Build
# -----------------------------------------------------------

build: ## Build Docker production image
	docker build \
		--target production \
		--tag $(APP_NAME):$(DOCKER_TAG) \
		--tag $(APP_NAME):latest \
		.

push: build ## Push image to registry
	docker tag $(APP_NAME):$(DOCKER_TAG) $(IMAGE):$(DOCKER_TAG)
	docker tag $(APP_NAME):$(DOCKER_TAG) $(IMAGE):latest
	docker push $(IMAGE):$(DOCKER_TAG)
	docker push $(IMAGE):latest

# -----------------------------------------------------------
# Deployment
# -----------------------------------------------------------

deploy-staging: ## Deploy to staging via blue-green
	./scripts/deploy-blue-green.sh \
		--cluster $(ECS_CLUSTER) \
		--service $(APP_NAME)-staging \
		--image $(IMAGE):$(DOCKER_TAG) \
		--region $(AWS_REGION) \
		--environment staging
	./scripts/smoke-test.sh \
		--url https://staging.example.com \
		--retries 10 \
		--delay 15

deploy-prod: ## Deploy to production via blue-green (manual confirmation)
	@echo "⚠️  Deploying to PRODUCTION — $(IMAGE):$(DOCKER_TAG)"
	@read -r -p "Continue? [y/N] " confirm && [ "$$confirm" = y ] || exit 1
	./scripts/deploy-blue-green.sh \
		--cluster $(ECS_CLUSTER) \
		--service $(APP_NAME)-production \
		--image $(IMAGE):$(DOCKER_TAG) \
		--region $(AWS_REGION) \
		--environment production
	./scripts/smoke-test.sh \
		--url https://app.example.com \
		--retries 15 \
		--delay 20

smoke-test: ## Run smoke tests against staging
	./scripts/smoke-test.sh --url https://staging.example.com --retries 5 --delay 10

# -----------------------------------------------------------
# Housekeeping
# -----------------------------------------------------------

clean: ## Remove build artifacts and stopped containers
	rm -rf coverage-html/ scan-reports/ .pytest_cache/ .mypy_cache/ .ruff_cache/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	docker compose down -v --remove-orphans 2>/dev/null || true
	docker image prune -f
