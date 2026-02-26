## Cursor Cloud specific instructions

This repository contains CI/CD pipeline template projects under `projects/`. They are infrastructure-as-code definitions (Jenkinsfile, GitLab CI YAML, Dockerfiles, shell scripts, Makefiles) — not runnable applications. There are no application dependencies to install and no dev servers to start.

### Validation

- **Shell scripts**: validate syntax with `bash -n <script>`.
- **YAML files**: validate with `python3 -c "import yaml; yaml.safe_load(open('<file>'))"`.
- **Makefiles**: verify expected targets exist by inspecting the file.
- Docker is not available in the cloud agent environment, so `docker build` and `docker compose` commands cannot be run.
