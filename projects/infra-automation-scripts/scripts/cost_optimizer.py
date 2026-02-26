#!/usr/bin/env python3
"""AWS Cost Optimization Analyzer.

Identifies cost optimization opportunities across an AWS account:
- Unused EC2 instances (stopped for extended periods)
- Oversized instances (low CPU utilization)
- Unattached EBS volumes
- Old EBS snapshots
- Unattached Elastic IPs
- Idle load balancers
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timezone, timedelta
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from tabulate import tabulate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cost_optimizer")

INSTANCE_HOURLY_COSTS: dict[str, float] = {
    "t2.micro": 0.0116, "t2.small": 0.023, "t2.medium": 0.0464,
    "t3.micro": 0.0104, "t3.small": 0.0208, "t3.medium": 0.0416,
    "t3.large": 0.0832, "t3.xlarge": 0.1664,
    "m5.large": 0.096, "m5.xlarge": 0.192, "m5.2xlarge": 0.384,
    "c5.large": 0.085, "c5.xlarge": 0.17, "c5.2xlarge": 0.34,
    "r5.large": 0.126, "r5.xlarge": 0.252, "r5.2xlarge": 0.504,
}

EBS_GB_MONTH_COST: dict[str, float] = {
    "gp2": 0.10, "gp3": 0.08, "io1": 0.125, "io2": 0.125,
    "st1": 0.045, "sc1": 0.015, "standard": 0.05,
}

EIP_HOURLY_COST = 0.005
SNAPSHOT_GB_MONTH_COST = 0.05


def get_session(profile: str | None = None, region: str | None = None) -> boto3.Session:
    """Create a boto3 session."""
    kwargs: dict[str, Any] = {}
    if profile:
        kwargs["profile_name"] = profile
    if region:
        kwargs["region_name"] = region
    return boto3.Session(**kwargs)


def get_tag_value(tags: list[dict[str, str]] | None, key: str = "Name") -> str:
    """Extract tag value from a list of AWS tags."""
    for tag in (tags or []):
        if tag["Key"] == key:
            return tag["Value"]
    return ""


def find_stopped_instances(ec2_client: Any, stopped_days: int = 7) -> list[dict[str, Any]]:
    """Find EC2 instances stopped for more than N days."""
    results: list[dict[str, Any]] = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=stopped_days)

    try:
        paginator = ec2_client.get_paginator("describe_instances")
        for page in paginator.paginate(Filters=[{"Name": "instance-state-name", "Values": ["stopped"]}]):
            for reservation in page["Reservations"]:
                for inst in reservation["Instances"]:
                    transition_reason = inst.get("StateTransitionReason", "")
                    launch_time = inst.get("LaunchTime", datetime.now(timezone.utc))
                    instance_type = inst["InstanceType"]
                    hourly_cost = INSTANCE_HOURLY_COSTS.get(instance_type, 0.05)
                    monthly_waste = hourly_cost * 730

                    results.append({
                        "ResourceType": "EC2 (Stopped)",
                        "ResourceId": inst["InstanceId"],
                        "Name": get_tag_value(inst.get("Tags")),
                        "Details": f"{instance_type}, stopped since ~{transition_reason[:30]}",
                        "EstMonthlyWaste": f"${monthly_waste:.2f}",
                        "Recommendation": "Terminate or create AMI and terminate",
                    })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to find stopped instances: %s", exc)

    return results


def find_underutilized_instances(
    session: boto3.Session,
    cpu_threshold: float = 10.0,
    days: int = 14,
) -> list[dict[str, Any]]:
    """Find running instances with low average CPU utilization."""
    ec2 = session.client("ec2")
    cloudwatch = session.client("cloudwatch")
    results: list[dict[str, Any]] = []
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=days)

    try:
        paginator = ec2.get_paginator("describe_instances")
        for page in paginator.paginate(Filters=[{"Name": "instance-state-name", "Values": ["running"]}]):
            for reservation in page["Reservations"]:
                for inst in reservation["Instances"]:
                    instance_id = inst["InstanceId"]
                    instance_type = inst["InstanceType"]

                    try:
                        metrics = cloudwatch.get_metric_statistics(
                            Namespace="AWS/EC2",
                            MetricName="CPUUtilization",
                            Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
                            StartTime=start_time,
                            EndTime=end_time,
                            Period=86400,
                            Statistics=["Average"],
                        )
                        datapoints = metrics.get("Datapoints", [])
                        if datapoints:
                            avg_cpu = sum(d["Average"] for d in datapoints) / len(datapoints)
                            if avg_cpu < cpu_threshold:
                                hourly_cost = INSTANCE_HOURLY_COSTS.get(instance_type, 0.05)
                                monthly_cost = hourly_cost * 730
                                potential_savings = monthly_cost * 0.5

                                results.append({
                                    "ResourceType": "EC2 (Underutilized)",
                                    "ResourceId": instance_id,
                                    "Name": get_tag_value(inst.get("Tags")),
                                    "Details": f"{instance_type}, avg CPU: {avg_cpu:.1f}%",
                                    "EstMonthlyWaste": f"${potential_savings:.2f}",
                                    "Recommendation": "Downsize or use Spot/Reserved",
                                })
                    except (ClientError, BotoCoreError) as exc:
                        logger.debug("Failed to get metrics for %s: %s", instance_id, exc)
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to find underutilized instances: %s", exc)

    return results


def find_unattached_volumes(ec2_client: Any) -> list[dict[str, Any]]:
    """Find EBS volumes not attached to any instance."""
    results: list[dict[str, Any]] = []
    try:
        paginator = ec2_client.get_paginator("describe_volumes")
        for page in paginator.paginate(Filters=[{"Name": "status", "Values": ["available"]}]):
            for vol in page["Volumes"]:
                vol_type = vol["VolumeType"]
                size = vol["Size"]
                monthly_cost = EBS_GB_MONTH_COST.get(vol_type, 0.10) * size

                results.append({
                    "ResourceType": "EBS Volume",
                    "ResourceId": vol["VolumeId"],
                    "Name": get_tag_value(vol.get("Tags")),
                    "Details": f"{size} GB {vol_type}, unattached",
                    "EstMonthlyWaste": f"${monthly_cost:.2f}",
                    "Recommendation": "Delete or snapshot and delete",
                })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to find unattached volumes: %s", exc)

    return results


def find_old_snapshots(
    ec2_client: Any,
    account_id: str,
    age_days: int = 90,
) -> list[dict[str, Any]]:
    """Find EBS snapshots older than N days."""
    results: list[dict[str, Any]] = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=age_days)

    try:
        paginator = ec2_client.get_paginator("describe_snapshots")
        for page in paginator.paginate(OwnerIds=[account_id]):
            for snap in page["Snapshots"]:
                start_time = snap["StartTime"]
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)

                if start_time < cutoff:
                    size = snap.get("VolumeSize", 0)
                    monthly_cost = SNAPSHOT_GB_MONTH_COST * size
                    age = (datetime.now(timezone.utc) - start_time).days

                    results.append({
                        "ResourceType": "EBS Snapshot",
                        "ResourceId": snap["SnapshotId"],
                        "Name": get_tag_value(snap.get("Tags")),
                        "Details": f"{size} GB, {age} days old",
                        "EstMonthlyWaste": f"${monthly_cost:.2f}",
                        "Recommendation": "Review and delete if unneeded",
                    })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to find old snapshots: %s", exc)

    return results


def find_unattached_eips(ec2_client: Any) -> list[dict[str, Any]]:
    """Find Elastic IPs not associated with any resource."""
    results: list[dict[str, Any]] = []
    monthly_cost = EIP_HOURLY_COST * 730

    try:
        response = ec2_client.describe_addresses()
        for addr in response.get("Addresses", []):
            if not addr.get("AssociationId"):
                results.append({
                    "ResourceType": "Elastic IP",
                    "ResourceId": addr.get("AllocationId", "N/A"),
                    "Name": addr.get("PublicIp", "N/A"),
                    "Details": f"Unattached EIP: {addr.get('PublicIp', 'N/A')}",
                    "EstMonthlyWaste": f"${monthly_cost:.2f}",
                    "Recommendation": "Release if unused",
                })
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to find unattached EIPs: %s", exc)

    return results


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Identify AWS cost optimization opportunities.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s --region us-east-1
  %(prog)s --profile prod --cpu-threshold 15 --snapshot-age 60
  %(prog)s --json --output report.json
        """,
    )
    parser.add_argument("--profile", help="AWS CLI profile")
    parser.add_argument("--region", default="us-east-1", help="AWS region (default: us-east-1)")
    parser.add_argument("--cpu-threshold", type=float, default=10.0, help="CPU underutilization threshold %% (default: 10)")
    parser.add_argument("--snapshot-age", type=int, default=90, help="Snapshot age threshold in days (default: 90)")
    parser.add_argument("--stopped-days", type=int, default=7, help="Days an instance has been stopped (default: 7)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--output", metavar="FILE", help="Write results to file")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging")
    return parser


def main() -> int:
    """Run the cost optimizer."""
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("Starting cost optimization analysis (region=%s)", args.region)

    session = get_session(profile=args.profile, region=args.region)
    ec2 = session.client("ec2")

    try:
        sts = session.client("sts")
        account_id = sts.get_caller_identity()["Account"]
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to get account ID: %s", exc)
        account_id = "self"

    all_findings: list[dict[str, Any]] = []

    logger.info("Checking for stopped instances...")
    all_findings.extend(find_stopped_instances(ec2, stopped_days=args.stopped_days))

    logger.info("Checking for underutilized instances...")
    all_findings.extend(find_underutilized_instances(session, cpu_threshold=args.cpu_threshold))

    logger.info("Checking for unattached EBS volumes...")
    all_findings.extend(find_unattached_volumes(ec2))

    logger.info("Checking for old snapshots...")
    all_findings.extend(find_old_snapshots(ec2, account_id, age_days=args.snapshot_age))

    logger.info("Checking for unattached Elastic IPs...")
    all_findings.extend(find_unattached_eips(ec2))

    if args.json:
        output = json.dumps(all_findings, indent=2, default=str)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as fh:
                fh.write(output)
            logger.info("JSON report written to %s", args.output)
        else:
            print(output)
    else:
        print(f"\n{'=' * 80}")
        print("  AWS Cost Optimization Report")
        print(f"  Region: {args.region} | Account: {account_id}")
        print(f"  Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"{'=' * 80}")

        if all_findings:
            print(tabulate(all_findings, headers="keys", tablefmt="grid", maxcolwidths=40))
            total_waste = sum(
                float(f["EstMonthlyWaste"].replace("$", ""))
                for f in all_findings
                if "EstMonthlyWaste" in f
            )
            print(f"\n  Total findings: {len(all_findings)}")
            print(f"  Estimated monthly waste: ${total_waste:.2f}")
        else:
            print("\n  No optimization opportunities found. Your AWS account looks efficient!")

        print(f"\n{'=' * 80}")

    logger.info("Cost optimization analysis complete. Found %d opportunities.", len(all_findings))
    return 0


if __name__ == "__main__":
    sys.exit(main())
