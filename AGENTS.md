## Cursor Cloud specific instructions

This repository contains CI/CD pipeline template projects under `projects/`. They are infrastructure-as-code definitions (Jenkinsfile, GitLab CI YAML, Dockerfiles, shell scripts, Makefiles) — not runnable applications. There are no application dependencies to install and no dev servers to start.

### Validation

- **Shell scripts**: validate syntax with `bash -n <script>`.
- **YAML files**: validate with `python3 -c "import yaml; yaml.safe_load(open('<file>'))"`.
- **JSON files** (e.g. Grafana dashboards): validate with `python3 -m json.tool <file>`.
- **Terraform files**: `terraform fmt -check` in the relevant directory (terraform is installed).
- **Makefiles**: verify expected targets exist with `make -n -f <Makefile> help`.
- **Ansible playbooks**: validate with `ansible-playbook --syntax-check` (ansible-core and ansible-lint are installed).
- **Python scripts** (`projects/infra-automation-scripts/`): validate with `python3 -m py_compile <script>`. Dependencies in `requirements.txt` (boto3, tabulate, requests, pyyaml) are installed.
- Docker is not available in the cloud agent environment, so `docker build` and `docker compose` commands cannot be run.
- IoT firmware `build-firmware.sh` can be tested locally by setting `FIRMWARE_WORKSPACE` and `BUILD_OUTPUT` to temp directories.

### Project-specific notes

- **ansible-config-mgmt**: Ansible roles have handlers in `roles/*/handlers/main.yml` (not inline in tasks). Use `make check-syntax` to validate. Cannot run playbooks against real hosts from the cloud agent.
- **infra-automation-scripts**: Python scripts use argparse CLI. `ssl_cert_monitor.py` and `health_checker.sh` can be tested against live endpoints. AWS-dependent scripts (`aws_resource_audit.py`, `backup_manager.py`, `cost_optimizer.py`) require AWS credentials. Use `make lint` to validate all scripts.
