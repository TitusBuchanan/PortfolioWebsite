.PHONY: audit backup backup-cleanup backup-copy health-check optimize monitor-certs install lint

PYTHON ?= python3
REGION ?= us-east-1
PROFILE_FLAG ?=

ifdef AWS_PROFILE
  PROFILE_FLAG = --profile $(AWS_PROFILE)
endif

install:
	pip install -r requirements.txt

audit:
	$(PYTHON) scripts/aws_resource_audit.py --region $(REGION) $(PROFILE_FLAG) $(ARGS)

backup:
	$(PYTHON) scripts/backup_manager.py --region $(REGION) $(PROFILE_FLAG) create $(ARGS)

backup-cleanup:
	$(PYTHON) scripts/backup_manager.py --region $(REGION) $(PROFILE_FLAG) cleanup $(ARGS)

backup-copy:
	$(PYTHON) scripts/backup_manager.py --region $(REGION) $(PROFILE_FLAG) copy $(ARGS)

health-check:
	bash scripts/health_checker.sh $(ARGS)

optimize:
	$(PYTHON) scripts/cost_optimizer.py --region $(REGION) $(PROFILE_FLAG) $(ARGS)

monitor-certs:
	$(PYTHON) scripts/ssl_cert_monitor.py $(ARGS)

lint:
	$(PYTHON) -m py_compile scripts/aws_resource_audit.py
	$(PYTHON) -m py_compile scripts/backup_manager.py
	$(PYTHON) -m py_compile scripts/cost_optimizer.py
	$(PYTHON) -m py_compile scripts/ssl_cert_monitor.py
	bash -n scripts/log_rotator.sh
	bash -n scripts/health_checker.sh
