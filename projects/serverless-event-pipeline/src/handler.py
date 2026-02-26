"""
S3 Event Handler Lambda

Triggered by S3 PutObject events on the incoming/ prefix.
Reads the uploaded JSON file, validates and transforms the data,
then publishes the enriched payload to an SNS topic for downstream processing.
"""

import json
import logging
import os
import urllib.parse
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

s3_client = boto3.client("s3")
sns_client = boto3.client("sns")

SNS_TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

MAX_PAYLOAD_SIZE = 256 * 1024  # SNS message size limit


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Process S3 event records, transform data, and publish to SNS."""
    processed = 0
    errors = 0

    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
        size = record["s3"]["object"].get("size", 0)

        logger.info("Processing s3://%s/%s (size=%d)", bucket, key, size)

        try:
            transformed = _process_object(bucket, key)
            _publish_to_sns(transformed, bucket, key)
            processed += 1
        except (ClientError, json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to process s3://%s/%s: %s", bucket, key, exc)
            errors += 1

    result = {
        "statusCode": 200,
        "body": {
            "processed": processed,
            "errors": errors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
    logger.info("Completed: %s", json.dumps(result["body"]))
    return result


def _process_object(bucket: str, key: str) -> dict[str, Any]:
    """Download an S3 object and transform its contents."""
    response = s3_client.get_object(Bucket=bucket, Key=key)
    raw_body = response["Body"].read()

    if len(raw_body) > MAX_PAYLOAD_SIZE:
        raise ValueError(
            f"Object s3://{bucket}/{key} exceeds max payload size "
            f"({len(raw_body)} > {MAX_PAYLOAD_SIZE})"
        )

    data = json.loads(raw_body)
    return _transform(data, bucket, key)


def _transform(data: dict[str, Any], bucket: str, key: str) -> dict[str, Any]:
    """Enrich and normalise the raw event data."""
    now = datetime.now(timezone.utc)

    return {
        "event_id": data.get("id", key.split("/")[-1].replace(".json", "")),
        "source_bucket": bucket,
        "source_key": key,
        "event_type": data.get("type", "unknown"),
        "payload": data.get("payload", data),
        "metadata": {
            "environment": ENVIRONMENT,
            "processed_at": now.isoformat(),
            "original_timestamp": data.get("timestamp"),
            "version": data.get("version", "1.0"),
        },
    }


def _publish_to_sns(message: dict[str, Any], bucket: str, key: str) -> None:
    """Publish the transformed message to SNS with message attributes."""
    sns_client.publish(
        TopicArn=SNS_TOPIC_ARN,
        Message=json.dumps(message, default=str),
        Subject=f"Event: {message['event_type']}",
        MessageAttributes={
            "event_type": {
                "DataType": "String",
                "StringValue": message["event_type"],
            },
            "source_bucket": {
                "DataType": "String",
                "StringValue": bucket,
            },
            "environment": {
                "DataType": "String",
                "StringValue": ENVIRONMENT,
            },
        },
    )
    logger.info(
        "Published event_id=%s type=%s to SNS",
        message["event_id"],
        message["event_type"],
    )
