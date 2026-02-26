.PHONY: help deploy deploy-prometheus deploy-grafana deploy-alertmanager port-forward-prometheus port-forward-grafana port-forward-alertmanager teardown status validate

NAMESPACE ?= monitoring

help: ## Show this help message
	@echo "Cluster Monitoring Stack"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; } /^[a-zA-Z_-]+:.*?##/ { printf "  %-30s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# --- Deploy targets ---

deploy: deploy-prometheus deploy-alertmanager deploy-grafana ## Deploy the full monitoring stack
	@echo "Monitoring stack deployed to namespace $(NAMESPACE)"
	@echo "Run 'make port-forward-grafana' to access Grafana at http://localhost:3000"

deploy-prometheus: ## Deploy Prometheus
	@echo "Deploying Prometheus..."
	kubectl apply -f k8s/prometheus-deployment.yaml
	kubectl -n $(NAMESPACE) rollout status deployment/prometheus --timeout=120s

deploy-grafana: ## Deploy Grafana
	@echo "Deploying Grafana..."
	kubectl apply -f k8s/grafana-deployment.yaml
	kubectl -n $(NAMESPACE) rollout status deployment/grafana --timeout=120s

deploy-alertmanager: ## Deploy Alertmanager
	@echo "Deploying Alertmanager..."
	kubectl apply -f k8s/alertmanager-deployment.yaml
	kubectl -n $(NAMESPACE) rollout status deployment/alertmanager --timeout=120s

# --- Port-forward targets ---

port-forward-prometheus: ## Port-forward Prometheus to localhost:9090
	@echo "Prometheus available at http://localhost:9090"
	kubectl -n $(NAMESPACE) port-forward svc/prometheus 9090:9090

port-forward-grafana: ## Port-forward Grafana to localhost:3000
	@echo "Grafana available at http://localhost:3000"
	kubectl -n $(NAMESPACE) port-forward svc/grafana 3000:3000

port-forward-alertmanager: ## Port-forward Alertmanager to localhost:9093
	@echo "Alertmanager available at http://localhost:9093"
	kubectl -n $(NAMESPACE) port-forward svc/alertmanager 9093:9093

# --- Status and validation ---

status: ## Show status of monitoring components
	@echo "=== Deployments ==="
	kubectl -n $(NAMESPACE) get deployments
	@echo ""
	@echo "=== Pods ==="
	kubectl -n $(NAMESPACE) get pods
	@echo ""
	@echo "=== Services ==="
	kubectl -n $(NAMESPACE) get services
	@echo ""
	@echo "=== PVCs ==="
	kubectl -n $(NAMESPACE) get pvc

validate: ## Validate Kubernetes manifests
	@echo "Validating manifests..."
	kubectl apply --dry-run=client -f k8s/prometheus-deployment.yaml
	kubectl apply --dry-run=client -f k8s/grafana-deployment.yaml
	kubectl apply --dry-run=client -f k8s/alertmanager-deployment.yaml
	@echo "All manifests are valid."

# --- Teardown targets ---

teardown: ## Remove the full monitoring stack
	@echo "Removing monitoring stack..."
	kubectl delete -f k8s/grafana-deployment.yaml --ignore-not-found
	kubectl delete -f k8s/alertmanager-deployment.yaml --ignore-not-found
	kubectl delete -f k8s/prometheus-deployment.yaml --ignore-not-found
	@echo "Monitoring stack removed."

teardown-data: teardown ## Remove monitoring stack and persistent data
	@echo "Removing persistent volume claims..."
	kubectl -n $(NAMESPACE) delete pvc prometheus-data --ignore-not-found
	kubectl -n $(NAMESPACE) delete pvc grafana-data --ignore-not-found
	kubectl -n $(NAMESPACE) delete pvc alertmanager-data --ignore-not-found
	@echo "All data removed."
