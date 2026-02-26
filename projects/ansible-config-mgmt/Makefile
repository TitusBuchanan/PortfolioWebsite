.PHONY: ping deploy deploy-webservers deploy-docker deploy-monitoring lint check-syntax dry-run

ANSIBLE_FLAGS ?=
INVENTORY ?= inventory/hosts.yml
LIMIT ?=

ifdef LIMIT
  LIMIT_FLAG = --limit $(LIMIT)
else
  LIMIT_FLAG =
endif

ping:
	ansible all -i $(INVENTORY) -m ping $(LIMIT_FLAG) $(ANSIBLE_FLAGS)

deploy:
	ansible-playbook -i $(INVENTORY) playbooks/site.yml $(LIMIT_FLAG) $(ANSIBLE_FLAGS)

deploy-webservers:
	ansible-playbook -i $(INVENTORY) playbooks/webserver.yml $(LIMIT_FLAG) $(ANSIBLE_FLAGS)

deploy-docker:
	ansible-playbook -i $(INVENTORY) playbooks/docker.yml $(LIMIT_FLAG) $(ANSIBLE_FLAGS)

deploy-monitoring:
	ansible-playbook -i $(INVENTORY) playbooks/monitoring.yml $(LIMIT_FLAG) $(ANSIBLE_FLAGS)

lint:
	ansible-lint playbooks/ roles/

check-syntax:
	ansible-playbook -i $(INVENTORY) playbooks/site.yml --syntax-check

dry-run:
	ansible-playbook -i $(INVENTORY) playbooks/site.yml --check --diff $(LIMIT_FLAG) $(ANSIBLE_FLAGS)
