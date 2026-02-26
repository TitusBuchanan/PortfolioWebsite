## Cursor Cloud specific instructions

This repository contains CI/CD pipeline template projects under `projects/`. They are infrastructure-as-code definitions (Jenkinsfile, GitLab CI YAML, Dockerfiles, shell scripts, Makefiles) — not runnable applications. There are no application dependencies to install and no dev servers to start.

### Validation

- **Shell scripts**: validate syntax with `bash -n <script>`.
- **YAML files**: validate with `python3 -c "import yaml; yaml.safe_load(open('<file>'))"`.
- **JSON files** (e.g. Grafana dashboards): validate with `python3 -m json.tool <file>`.
- **Terraform files**: `terraform fmt -check` in the relevant directory (terraform is installed).
- **Makefiles**: verify expected targets exist with `make -n -f <Makefile> help`.
- Docker is not available in the cloud agent environment, so `docker build` and `docker compose` commands cannot be run.
- IoT firmware `build-firmware.sh` can be tested locally by setting `FIRMWARE_WORKSPACE` and `BUILD_OUTPUT` to temp directories.
