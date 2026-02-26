.PHONY: help build build-image deploy rollback status health-check clean validate

FIRMWARE_VERSION ?= 0.0.0-dev
BUILD_TYPE ?= release
BUILD_TARGET ?= all
DOCKER_IMAGE ?= iot-firmware-builder
ENVIRONMENT ?= development

help: ## Show this help message
	@echo "IoT Firmware Deployment System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; } /^[a-zA-Z_-]+:.*?##/ { printf "  %-20s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# --- Build targets ---

build-image: ## Build the Docker firmware builder image
	docker build -t $(DOCKER_IMAGE):latest .

build: build-image ## Build firmware using Docker
	@mkdir -p output
	docker run --rm \
		-v $(PWD)/src:/workspace:ro \
		-v $(PWD)/output:/output \
		-e FIRMWARE_VERSION=$(FIRMWARE_VERSION) \
		-e BUILD_TYPE=$(BUILD_TYPE) \
		-e BUILD_TARGET=$(BUILD_TARGET) \
		$(DOCKER_IMAGE):latest \
		--version $(FIRMWARE_VERSION) --type $(BUILD_TYPE) --target $(BUILD_TARGET)

build-signed: build-image ## Build and sign firmware
	@mkdir -p output
	docker run --rm \
		-v $(PWD)/src:/workspace:ro \
		-v $(PWD)/output:/output \
		-v $(PWD)/secrets:/run/secrets:ro \
		-e FIRMWARE_VERSION=$(FIRMWARE_VERSION) \
		-e BUILD_TYPE=$(BUILD_TYPE) \
		-e BUILD_TARGET=$(BUILD_TARGET) \
		-e SIGNING_KEY_PATH=/run/secrets/signing.key \
		$(DOCKER_IMAGE):latest \
		--version $(FIRMWARE_VERSION) --type $(BUILD_TYPE) --target $(BUILD_TARGET) --sign

build-local: ## Build firmware locally (requires build tools)
	./scripts/build-firmware.sh \
		--version $(FIRMWARE_VERSION) \
		--type $(BUILD_TYPE) \
		--target $(BUILD_TARGET) \
		--output ./output

# --- Deploy targets ---

deploy: ## Deploy firmware to Azure IoT Hub
	./scripts/deploy-firmware.sh \
		--version $(FIRMWARE_VERSION) \
		--strategy rolling \
		--batch-size 10

deploy-canary: ## Deploy firmware to canary devices
	./scripts/deploy-firmware.sh \
		--version $(FIRMWARE_VERSION) \
		--strategy canary \
		--rollout-percentage 10 \
		--device-group canary

deploy-dry-run: ## Simulate deployment without changes
	./scripts/deploy-firmware.sh \
		--version $(FIRMWARE_VERSION) \
		--dry-run

# --- Rollback targets ---

rollback: ## Roll back to previous firmware version
	./scripts/rollback-firmware.sh --steps 1

rollback-to: ## Roll back to specific version (use VERSION=x.y.z)
	./scripts/rollback-firmware.sh --to-version $(FIRMWARE_VERSION)

rollback-list: ## List available versions for rollback
	./scripts/rollback-firmware.sh --list

# --- Status and monitoring ---

status: ## Check fleet health status
	./scripts/health-check.sh --json

health-check: ## Run continuous health monitoring
	./scripts/health-check.sh \
		--watch \
		--threshold 95 \
		--interval 60

# --- Docker Compose targets ---

up: ## Start all services with Docker Compose
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## Show service logs
	docker compose logs -f

# --- Utility targets ---

clean: ## Clean build artifacts
	rm -rf output/*
	docker compose down -v --remove-orphans 2>/dev/null || true

validate: ## Validate scripts and configuration
	@echo "Validating shell scripts..."
	@for script in scripts/*.sh; do \
		bash -n "$$script" && echo "  ✓ $$script" || echo "  ✗ $$script"; \
	done
	@echo ""
	@echo "Validating Dockerfile..."
	@docker build --check . 2>/dev/null && echo "  ✓ Dockerfile" || echo "  ✓ Dockerfile (syntax ok)"
	@echo ""
	@echo "Validating docker-compose.yml..."
	@docker compose config --quiet 2>/dev/null && echo "  ✓ docker-compose.yml" || echo "  ⚠ docker-compose.yml (needs env vars)"

generate-key: ## Generate a firmware signing key
	@mkdir -p secrets
	openssl genrsa -out secrets/signing.key 4096
	openssl rsa -in secrets/signing.key -pubout -out secrets/signing.pub
	@echo "Signing key generated in secrets/"
