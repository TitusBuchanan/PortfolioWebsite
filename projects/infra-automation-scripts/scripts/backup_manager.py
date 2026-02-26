#!/usr/bin/env python3
"""EBS Snapshot Backup Manager.

Manages EBS snapshots for backup and disaster recovery:
- Create snapshots with descriptive tags
- Delete snapshots older than a retention period
- Cross-region copy for disaster recovery
"""

import argparse
import logging
import sys
from datetime import datetime, timezone, timedelta
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("backup_manager")


def get_session(profile: str | None = None, region: str | None = None) -> boto3.Session:
    """Create a boto3 session."""
    kwargs: dict[str, Any] = {}
    if profile:
        kwargs["profile_name"] = profile
    if region:
        kwargs["region_name"] = region
    return boto3.Session(**kwargs)


def get_volume_name(ec2_client: Any, volume_id: str) -> str:
    """Get the Name tag of an EBS volume."""
    try:
        response = ec2_client.describe_volumes(VolumeIds=[volume_id])
        for tag in response["Volumes"][0].get("Tags", []):
            if tag["Key"] == "Name":
                return tag["Value"]
    except (ClientError, BotoCoreError, IndexError):
        pass
    return ""


def create_snapshots(
    session: boto3.Session,
    volume_ids: list[str] | None = None,
    tag_filters: dict[str, str] | None = None,
    description_prefix: str = "Automated backup",
    extra_tags: dict[str, str] | None = None,
) -> list[str]:
    """Create EBS snapshots for specified volumes or volumes matching tag filters.

    Returns list of created snapshot IDs.
    """
    ec2 = session.client("ec2")
    snapshot_ids: list[str] = []
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y-%m-%d_%H%M%S")

    volumes_to_snapshot: list[str] = []

    if volume_ids:
        volumes_to_snapshot = volume_ids
    elif tag_filters:
        filters = [{"Name": f"tag:{k}", "Values": [v]} for k, v in tag_filters.items()]
        paginator = ec2.get_paginator("describe_volumes")
        for page in paginator.paginate(Filters=filters):
            for vol in page["Volumes"]:
                volumes_to_snapshot.append(vol["VolumeId"])
    else:
        logger.warning("No volume IDs or tag filters specified. Nothing to snapshot.")
        return snapshot_ids

    logger.info("Creating snapshots for %d volumes", len(volumes_to_snapshot))

    for vol_id in volumes_to_snapshot:
        vol_name = get_volume_name(ec2, vol_id)
        description = f"{description_prefix} - {vol_name or vol_id} - {timestamp}"

        tags = [
            {"Key": "Name", "Value": f"backup-{vol_name or vol_id}-{timestamp}"},
            {"Key": "CreatedBy", "Value": "backup_manager"},
            {"Key": "SourceVolume", "Value": vol_id},
            {"Key": "BackupDate", "Value": now.isoformat()},
        ]
        if extra_tags:
            tags.extend({"Key": k, "Value": v} for k, v in extra_tags.items())

        try:
            response = ec2.create_snapshot(
                VolumeId=vol_id,
                Description=description,
                TagSpecifications=[{
                    "ResourceType": "snapshot",
                    "Tags": tags,
                }],
            )
            snap_id = response["SnapshotId"]
            snapshot_ids.append(snap_id)
            logger.info("Created snapshot %s for volume %s (%s)", snap_id, vol_id, vol_name)
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to create snapshot for %s: %s", vol_id, exc)

    return snapshot_ids


def delete_old_snapshots(
    session: boto3.Session,
    retention_days: int = 30,
    dry_run: bool = False,
) -> int:
    """Delete snapshots created by backup_manager older than retention_days.

    Returns count of deleted snapshots.
    """
    ec2 = session.client("ec2")
    sts = session.client("sts")
    account_id = sts.get_caller_identity()["Account"]

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    deleted = 0

    logger.info(
        "Deleting snapshots older than %d days (before %s)",
        retention_days,
        cutoff.isoformat(),
    )

    paginator = ec2.get_paginator("describe_snapshots")
    for page in paginator.paginate(
        OwnerIds=[account_id],
        Filters=[{"Name": "tag:CreatedBy", "Values": ["backup_manager"]}],
    ):
        for snap in page["Snapshots"]:
            start_time = snap["StartTime"]
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)

            if start_time < cutoff:
                snap_id = snap["SnapshotId"]
                if dry_run:
                    logger.info("[DRY RUN] Would delete snapshot %s (created %s)", snap_id, start_time)
                else:
                    try:
                        ec2.delete_snapshot(SnapshotId=snap_id)
                        logger.info("Deleted snapshot %s (created %s)", snap_id, start_time)
                        deleted += 1
                    except (ClientError, BotoCoreError) as exc:
                        logger.error("Failed to delete snapshot %s: %s", snap_id, exc)

    logger.info("Deleted %d old snapshots", deleted)
    return deleted


def copy_snapshots_cross_region(
    session: boto3.Session,
    snapshot_ids: list[str],
    dest_region: str,
    dry_run: bool = False,
) -> list[str]:
    """Copy snapshots to another region for disaster recovery.

    Returns list of new snapshot IDs in the destination region.
    """
    dest_session = get_session(region=dest_region)
    dest_ec2 = dest_session.client("ec2")
    source_region = session.region_name
    copied_ids: list[str] = []

    logger.info(
        "Copying %d snapshots from %s to %s",
        len(snapshot_ids),
        source_region,
        dest_region,
    )

    for snap_id in snapshot_ids:
        if dry_run:
            logger.info("[DRY RUN] Would copy snapshot %s to %s", snap_id, dest_region)
            continue

        try:
            response = dest_ec2.copy_snapshot(
                SourceSnapshotId=snap_id,
                SourceRegion=source_region,
                Description=f"DR copy of {snap_id} from {source_region}",
                TagSpecifications=[{
                    "ResourceType": "snapshot",
                    "Tags": [
                        {"Key": "CreatedBy", "Value": "backup_manager"},
                        {"Key": "SourceSnapshot", "Value": snap_id},
                        {"Key": "SourceRegion", "Value": source_region},
                        {"Key": "CopyType", "Value": "disaster-recovery"},
                    ],
                }],
            )
            new_snap_id = response["SnapshotId"]
            copied_ids.append(new_snap_id)
            logger.info("Copied %s -> %s in %s", snap_id, new_snap_id, dest_region)
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to copy snapshot %s to %s: %s", snap_id, dest_region, exc)

    return copied_ids


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Manage EBS snapshots for backup and disaster recovery.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s create --volume-ids vol-0abc123 vol-0def456
  %(prog)s create --tag-filter Environment=production
  %(prog)s cleanup --retention 30
  %(prog)s copy --snapshot-ids snap-0abc123 --dest-region us-west-2
        """,
    )
    parser.add_argument("--profile", help="AWS CLI profile")
    parser.add_argument("--region", default="us-east-1", help="AWS region (default: us-east-1)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("-n", "--dry-run", action="store_true", help="Dry run mode")

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    create_parser = subparsers.add_parser("create", help="Create snapshots")
    create_group = create_parser.add_mutually_exclusive_group(required=True)
    create_group.add_argument("--volume-ids", nargs="+", help="Volume IDs to snapshot")
    create_group.add_argument(
        "--tag-filter",
        metavar="KEY=VALUE",
        action="append",
        help="Tag filter for volumes (can be repeated)",
    )
    create_parser.add_argument("--description", default="Automated backup", help="Snapshot description prefix")
    create_parser.add_argument("--tag", metavar="KEY=VALUE", action="append", help="Extra tags (can be repeated)")

    cleanup_parser = subparsers.add_parser("cleanup", help="Delete old snapshots")
    cleanup_parser.add_argument("--retention", type=int, default=30, help="Retention period in days (default: 30)")

    copy_parser = subparsers.add_parser("copy", help="Copy snapshots cross-region")
    copy_parser.add_argument("--snapshot-ids", nargs="+", required=True, help="Snapshot IDs to copy")
    copy_parser.add_argument("--dest-region", required=True, help="Destination region")

    return parser


def parse_key_value_pairs(pairs: list[str] | None) -> dict[str, str]:
    """Parse KEY=VALUE pairs from CLI arguments."""
    result: dict[str, str] = {}
    if not pairs:
        return result
    for pair in pairs:
        if "=" not in pair:
            logger.warning("Ignoring invalid KEY=VALUE pair: %s", pair)
            continue
        key, value = pair.split("=", 1)
        result[key.strip()] = value.strip()
    return result


def main() -> int:
    """Run the backup manager."""
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    session = get_session(profile=args.profile, region=args.region)

    if args.command == "create":
        tag_filters = parse_key_value_pairs(args.tag_filter) if args.tag_filter else None
        extra_tags = parse_key_value_pairs(args.tag) if args.tag else None
        snapshot_ids = create_snapshots(
            session,
            volume_ids=args.volume_ids,
            tag_filters=tag_filters,
            description_prefix=args.description,
            extra_tags=extra_tags,
        )
        logger.info("Created %d snapshots: %s", len(snapshot_ids), ", ".join(snapshot_ids))

    elif args.command == "cleanup":
        deleted = delete_old_snapshots(session, retention_days=args.retention, dry_run=args.dry_run)
        logger.info("Cleanup complete. Deleted %d snapshots.", deleted)

    elif args.command == "copy":
        copied = copy_snapshots_cross_region(
            session,
            snapshot_ids=args.snapshot_ids,
            dest_region=args.dest_region,
            dry_run=args.dry_run,
        )
        logger.info("Copied %d snapshots to %s", len(copied), args.dest_region)

    return 0


if __name__ == "__main__":
    sys.exit(main())
