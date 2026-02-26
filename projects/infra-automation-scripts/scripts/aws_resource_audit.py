#!/usr/bin/env python3
"""AWS Resource Audit Tool.

Audits AWS resources across an account: EC2 instances, RDS instances,
S3 buckets, unused EBS volumes, and unattached Elastic IPs.
Outputs results as formatted tables with optional CSV export.
"""

import argparse
import csv
import io
import logging
import sys
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from tabulate import tabulate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aws_resource_audit")


def get_session(profile: str | None = None, region: str | None = None) -> boto3.Session:
    """Create a boto3 session with optional profile and region."""
    kwargs: dict[str, Any] = {}
    if profile:
        kwargs["profile_name"] = profile
    if region:
        kwargs["region_name"] = region
    return boto3.Session(**kwargs)


def audit_ec2_instances(session: boto3.Session) -> list[dict[str, str]]:
    """List all EC2 instances with key metadata."""
    ec2 = session.client("ec2")
    results: list[dict[str, str]] = []
    try:
        paginator = ec2.get_paginator("describe_instances")
        for page in paginator.paginate():
            for reservation in page["Reservations"]:
                for instance in reservation["Instances"]:
                    name = ""
                    for tag in instance.get("Tags", []):
                        if tag["Key"] == "Name":
                            name = tag["Value"]
                            break
                    results.append({
                        "InstanceId": instance["InstanceId"],
                        "Name": name,
                        "Type": instance["InstanceType"],
                        "State": instance["State"]["Name"],
                        "PrivateIP": instance.get("PrivateIpAddress", "N/A"),
                        "PublicIP": instance.get("PublicIpAddress", "N/A"),
                        "LaunchTime": str(instance.get("LaunchTime", "")),
                        "AZ": instance["Placement"]["AvailabilityZone"],
                    })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to audit EC2 instances: %s", exc)
    return results


def audit_rds_instances(session: boto3.Session) -> list[dict[str, str]]:
    """List all RDS instances with key metadata."""
    rds = session.client("rds")
    results: list[dict[str, str]] = []
    try:
        paginator = rds.get_paginator("describe_db_instances")
        for page in paginator.paginate():
            for db in page["DBInstances"]:
                results.append({
                    "DBInstanceId": db["DBInstanceIdentifier"],
                    "Engine": f"{db['Engine']} {db.get('EngineVersion', '')}",
                    "Class": db["DBInstanceClass"],
                    "Status": db["DBInstanceStatus"],
                    "MultiAZ": str(db.get("MultiAZ", False)),
                    "Storage": f"{db.get('AllocatedStorage', 0)} GB",
                    "Endpoint": db.get("Endpoint", {}).get("Address", "N/A"),
                })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to audit RDS instances: %s", exc)
    return results


def audit_s3_buckets(session: boto3.Session) -> list[dict[str, str]]:
    """List all S3 buckets with creation date and region."""
    s3 = session.client("s3")
    results: list[dict[str, str]] = []
    try:
        response = s3.list_buckets()
        for bucket in response.get("Buckets", []):
            bucket_name = bucket["Name"]
            try:
                location = s3.get_bucket_location(Bucket=bucket_name)
                region = location.get("LocationConstraint") or "us-east-1"
            except (ClientError, BotoCoreError):
                region = "unknown"

            results.append({
                "BucketName": bucket_name,
                "Region": region,
                "CreationDate": str(bucket.get("CreationDate", "")),
            })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to audit S3 buckets: %s", exc)
    return results


def audit_unused_ebs_volumes(session: boto3.Session) -> list[dict[str, str]]:
    """Find EBS volumes that are not attached to any instance."""
    ec2 = session.client("ec2")
    results: list[dict[str, str]] = []
    try:
        paginator = ec2.get_paginator("describe_volumes")
        for page in paginator.paginate(Filters=[{"Name": "status", "Values": ["available"]}]):
            for volume in page["Volumes"]:
                name = ""
                for tag in volume.get("Tags", []):
                    if tag["Key"] == "Name":
                        name = tag["Value"]
                        break
                results.append({
                    "VolumeId": volume["VolumeId"],
                    "Name": name,
                    "Size": f"{volume['Size']} GB",
                    "Type": volume["VolumeType"],
                    "AZ": volume["AvailabilityZone"],
                    "CreateTime": str(volume.get("CreateTime", "")),
                })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to audit EBS volumes: %s", exc)
    return results


def audit_unattached_eips(session: boto3.Session) -> list[dict[str, str]]:
    """Find Elastic IPs that are not associated with any resource."""
    ec2 = session.client("ec2")
    results: list[dict[str, str]] = []
    try:
        response = ec2.describe_addresses()
        for addr in response.get("Addresses", []):
            if not addr.get("AssociationId"):
                results.append({
                    "AllocationId": addr.get("AllocationId", "N/A"),
                    "PublicIP": addr.get("PublicIp", "N/A"),
                    "Domain": addr.get("Domain", "N/A"),
                })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to audit Elastic IPs: %s", exc)
    return results


def print_section(title: str, data: list[dict[str, str]], output_csv: str | None = None) -> None:
    """Print a section header and data table, optionally write to CSV."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")
    if not data:
        print("  No resources found.")
        return

    print(tabulate(data, headers="keys", tablefmt="grid"))
    print(f"  Total: {len(data)}")

    if output_csv:
        write_csv(data, output_csv, title)


def write_csv(data: list[dict[str, str]], filepath: str, section: str) -> None:
    """Append data to a CSV file."""
    mode = "a" if section != "EC2 Instances" else "w"
    try:
        with open(filepath, mode, newline="", encoding="utf-8") as fh:
            if mode == "a":
                fh.write(f"\n# {section}\n")
            writer = csv.DictWriter(fh, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        logger.info("CSV data for '%s' written to %s", section, filepath)
    except OSError as exc:
        logger.error("Failed to write CSV file %s: %s", filepath, exc)


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Audit AWS resources across an account.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s --region us-east-1
  %(prog)s --profile production --csv report.csv
  %(prog)s --sections ec2 s3 ebs
        """,
    )
    parser.add_argument(
        "--profile",
        help="AWS CLI profile to use",
    )
    parser.add_argument(
        "--region",
        default="us-east-1",
        help="AWS region (default: us-east-1)",
    )
    parser.add_argument(
        "--csv",
        dest="csv_output",
        metavar="FILE",
        help="Export results to CSV file",
    )
    parser.add_argument(
        "--sections",
        nargs="+",
        choices=["ec2", "rds", "s3", "ebs", "eip"],
        default=["ec2", "rds", "s3", "ebs", "eip"],
        help="Sections to audit (default: all)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )
    return parser


def main() -> int:
    """Run the AWS resource audit."""
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("Starting AWS resource audit (region=%s)", args.region)
    session = get_session(profile=args.profile, region=args.region)

    audit_functions = {
        "ec2": ("EC2 Instances", audit_ec2_instances),
        "rds": ("RDS Instances", audit_rds_instances),
        "s3": ("S3 Buckets", audit_s3_buckets),
        "ebs": ("Unused EBS Volumes", audit_unused_ebs_volumes),
        "eip": ("Unattached Elastic IPs", audit_unattached_eips),
    }

    for section_key in args.sections:
        title, func = audit_functions[section_key]
        logger.info("Auditing %s...", title)
        try:
            data = func(session)
            print_section(title, data, args.csv_output)
        except Exception as exc:
            logger.error("Error auditing %s: %s", title, exc)

    logger.info("Audit complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
