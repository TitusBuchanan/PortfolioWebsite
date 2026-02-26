.PHONY: build validate test invoke-handler invoke-processor deploy deploy-staging deploy-prod clean logs

STACK_NAME ?= serverless-event-pipeline
REGION ?= us-east-1

build:
	sam build

validate:
	sam validate --lint

test:
	python -m pytest tests/ -v --tb=short

invoke-handler:
	sam local invoke HandlerFunction --event events/s3_put.json

invoke-processor:
	sam local invoke ProcessorFunction --event events/sqs_message.json

deploy: build validate
	sam deploy --config-env default

deploy-staging: build validate
	sam deploy --config-env staging

deploy-prod: build validate
	sam deploy --config-env prod

clean:
	rm -rf .aws-sam/

logs:
	sam logs --stack-name $(STACK_NAME) --region $(REGION) --tail

logs-handler:
	sam logs --name HandlerFunction --stack-name $(STACK_NAME) --region $(REGION) --tail

logs-processor:
	sam logs --name ProcessorFunction --stack-name $(STACK_NAME) --region $(REGION) --tail
