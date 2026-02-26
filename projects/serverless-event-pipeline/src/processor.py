"""
SQS Processor Lambda

Consumes messages from the processing SQS queue (originating from SNS),
applies business logic, and persists the results to DynamoDB.

Supports partial batch failure reporting via ReportBatchItemFailures.
"""

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["TABLE_NAME"]
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Process a batch of SQS messages and report individual failures."""
    batch_item_failures: list[dict[str, str]] = []

    for record in event.get("Records", []):
        message_id = record["messageId"]
        try:
            body = json.loads(record["body"])
            _process_message(body, message_id)
        except (json.JSONDecodeError, KeyError, ClientError) as exc:
            logger.error("Failed to process message %s: %s", message_id, exc)
            batch_item_failures.append({"itemIdentifier": message_id})

    if batch_item_failures:
        logger.warning(
            "Batch had %d failures out of %d messages",
            len(batch_item_failures),
            len(event.get("Records", [])),
        )

    return {"batchItemFailures": batch_item_failures}


def _process_message(body: dict[str, Any], message_id: str) -> None:
    """Transform and persist a single message."""
    event_id = body.get("event_id", message_id)
    event_type = body.get("event_type", "unknown")
    payload = body.get("payload", {})
    metadata = body.get("metadata", {})

    now = datetime.now(timezone.utc)

    result = _apply_business_logic(event_type, payload)

    item = {
        "pk": f"EVENT#{event_type}",
        "sk": f"{event_id}",
        "event_id": event_id,
        "event_type": event_type,
        "source_bucket": body.get("source_bucket", ""),
        "source_key": body.get("source_key", ""),
        "original_payload": payload,
        "processed_result": result,
        "processed_at": now.isoformat(),
        "original_timestamp": metadata.get("original_timestamp", ""),
        "environment": ENVIRONMENT,
        "checksum": _compute_checksum(payload),
        "ttl": int(now.timestamp()) + (90 * 86400),  # 90-day TTL
    }

    table.put_item(Item=item)
    logger.info("Stored result for event_id=%s type=%s", event_id, event_type)


def _apply_business_logic(
    event_type: str, payload: dict[str, Any]
) -> dict[str, Any]:
    """
    Apply event-type-specific transformation rules.
    Extend the dispatch table for new event types.
    """
    processors = {
        "order": _process_order,
        "user_signup": _process_user_signup,
        "notification": _process_notification,
    }

    processor = processors.get(event_type, _process_default)
    return processor(payload)


def _process_order(payload: dict[str, Any]) -> dict[str, Any]:
    items = payload.get("items", [])
    total = sum(float(item.get("price", 0)) * int(item.get("quantity", 1)) for item in items)
    return {
        "status": "processed",
        "item_count": len(items),
        "total_amount": round(total, 2),
        "currency": payload.get("currency", "USD"),
    }


def _process_user_signup(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "processed",
        "user_id": payload.get("user_id", ""),
        "email_domain": payload.get("email", "").split("@")[-1] if payload.get("email") else "",
        "source": payload.get("signup_source", "direct"),
    }


def _process_notification(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "processed",
        "channel": payload.get("channel", "email"),
        "priority": payload.get("priority", "normal"),
        "recipient_count": len(payload.get("recipients", [])),
    }


def _process_default(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "processed",
        "raw_keys": list(payload.keys()),
    }


def _compute_checksum(data: dict[str, Any]) -> str:
    """SHA-256 checksum of the JSON-serialised payload for deduplication."""
    content = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(content.encode()).hexdigest()
