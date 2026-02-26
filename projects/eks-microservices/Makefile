.PHONY: help init plan apply destroy helm-lint helm-install helm-upgrade helm-uninstall k8s-apply k8s-delete validate

CLUSTER_NAME ?= microservices-platform
NAMESPACE ?= microservices
RELEASE_NAME ?= my-service
HELM_CHART_DIR ?= helm
ENVIRONMENT ?= development
AWS_REGION ?= us-west-2

help: ## Show this help message
	@echo "EKS Microservices Platform"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; } /^[a-zA-Z_-]+:.*?##/ { printf "  %-20s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# --- Terraform targets ---

init: ## Initialize Terraform
	cd terraform && terraform init

plan: ## Run Terraform plan
	cd terraform && terraform plan \
		-var="cluster_name=$(CLUSTER_NAME)" \
		-var="environment=$(ENVIRONMENT)" \
		-var="aws_region=$(AWS_REGION)"

apply: ## Apply Terraform configuration
	cd terraform && terraform apply \
		-var="cluster_name=$(CLUSTER_NAME)" \
		-var="environment=$(ENVIRONMENT)" \
		-var="aws_region=$(AWS_REGION)" \
		-auto-approve

destroy: ## Destroy Terraform-managed infrastructure
	cd terraform && terraform destroy \
		-var="cluster_name=$(CLUSTER_NAME)" \
		-var="environment=$(ENVIRONMENT)" \
		-var="aws_region=$(AWS_REGION)" \
		-auto-approve

# --- Kubectl targets ---

kubeconfig: ## Update kubeconfig for the cluster
	aws eks update-kubeconfig --region $(AWS_REGION) --name $(CLUSTER_NAME)

k8s-apply: ## Apply Kubernetes manifests (namespace, network policies)
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/network-policy.yaml

k8s-delete: ## Delete Kubernetes manifests
	kubectl delete -f k8s/network-policy.yaml --ignore-not-found
	kubectl delete -f k8s/namespace.yaml --ignore-not-found

# --- Helm targets ---

helm-lint: ## Lint the Helm chart
	helm lint $(HELM_CHART_DIR)

helm-install: ## Install the Helm chart
	helm install $(RELEASE_NAME) $(HELM_CHART_DIR) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--wait \
		--timeout 5m

helm-upgrade: ## Upgrade the Helm release
	helm upgrade $(RELEASE_NAME) $(HELM_CHART_DIR) \
		--namespace $(NAMESPACE) \
		--wait \
		--timeout 5m

helm-uninstall: ## Uninstall the Helm release
	helm uninstall $(RELEASE_NAME) --namespace $(NAMESPACE)

helm-template: ## Render Helm templates locally
	helm template $(RELEASE_NAME) $(HELM_CHART_DIR) --namespace $(NAMESPACE)

helm-diff: ## Show diff of pending Helm upgrade
	helm diff upgrade $(RELEASE_NAME) $(HELM_CHART_DIR) --namespace $(NAMESPACE)

# --- Validation targets ---

validate: helm-lint ## Validate all configurations
	@echo "Validating Kubernetes manifests..."
	kubectl apply --dry-run=client -f k8s/namespace.yaml
	kubectl apply --dry-run=client -f k8s/network-policy.yaml
	@echo "Validating Terraform configuration..."
	cd terraform && terraform validate
	@echo "All validations passed."

# --- Composite targets ---

deploy: k8s-apply helm-install ## Full deployment: apply K8s manifests and install Helm chart

teardown: helm-uninstall k8s-delete ## Full teardown: uninstall Helm chart and delete K8s manifests

all: init apply kubeconfig deploy ## Full setup: init, apply infra, configure kubectl, deploy
