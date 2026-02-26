#!/usr/bin/env python3
"""SSL Certificate Expiry Monitor.

Monitors SSL/TLS certificate expiry for a list of domains.
Sends alerts via AWS SNS or prints warnings if certificates
are expiring within a configurable threshold.
"""

import argparse
import json
import logging
import socket
import ssl
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
logger = logging.getLogger("ssl_cert_monitor")


def get_cert_info(hostname: str, port: int = 443, timeout: int = 10) -> dict[str, Any]:
    """Retrieve SSL certificate information for a hostname.

    Returns dict with certificate details or error information.
    """
    result: dict[str, Any] = {
        "hostname": hostname,
        "port": port,
        "status": "unknown",
        "issuer": "",
        "subject": "",
        "not_before": "",
        "not_after": "",
        "days_remaining": -1,
        "serial_number": "",
        "san": [],
        "error": "",
    }

    context = ssl.create_default_context()

    try:
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as tls_sock:
                cert = tls_sock.getpeercert()

                if not cert:
                    result["status"] = "error"
                    result["error"] = "No certificate returned"
                    return result

                not_after_str = cert.get("notAfter", "")
                not_before_str = cert.get("notBefore", "")

                not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                not_before = datetime.strptime(not_before_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)

                now = datetime.now(timezone.utc)
                days_remaining = (not_after - now).days

                issuer_parts = []
                for rdn in cert.get("issuer", ()):
                    for attr_type, attr_value in rdn:
                        issuer_parts.append(f"{attr_type}={attr_value}")

                subject_parts = []
                for rdn in cert.get("subject", ()):
                    for attr_type, attr_value in rdn:
                        subject_parts.append(f"{attr_type}={attr_value}")

                san_list = []
                for san_type, san_value in cert.get("subjectAltName", ()):
                    san_list.append(san_value)

                result.update({
                    "status": "valid" if days_remaining > 0 else "expired",
                    "issuer": ", ".join(issuer_parts),
                    "subject": ", ".join(subject_parts),
                    "not_before": not_before.isoformat(),
                    "not_after": not_after.isoformat(),
                    "days_remaining": days_remaining,
                    "serial_number": cert.get("serialNumber", ""),
                    "san": san_list,
                })

    except ssl.SSLCertVerificationError as exc:
        result["status"] = "invalid"
        result["error"] = str(exc)
        logger.warning("SSL verification failed for %s: %s", hostname, exc)

    except socket.timeout:
        result["status"] = "timeout"
        result["error"] = f"Connection timed out after {timeout}s"
        logger.warning("Connection to %s:%d timed out", hostname, port)

    except socket.gaierror as exc:
        result["status"] = "dns_error"
        result["error"] = f"DNS resolution failed: {exc}"
        logger.warning("DNS resolution failed for %s: %s", hostname, exc)

    except (OSError, ssl.SSLError) as exc:
        result["status"] = "error"
        result["error"] = str(exc)
        logger.warning("Error checking %s:%d: %s", hostname, port, exc)

    return result


def send_sns_alert(
    sns_topic_arn: str,
    region: str,
    alerts: list[dict[str, Any]],
    profile: str | None = None,
) -> bool:
    """Send certificate expiry alerts via AWS SNS."""
    if not alerts:
        return True

    try:
        kwargs: dict[str, Any] = {"region_name": region}
        if profile:
            kwargs["profile_name"] = profile
        session = boto3.Session(**kwargs)
        sns = session.client("sns")

        subject = f"SSL Certificate Alert: {len(alerts)} certificate(s) need attention"
        body_lines = [
            "SSL Certificate Expiry Monitor Report",
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
            f"Alerts: {len(alerts)}",
            "",
        ]

        for alert in alerts:
            body_lines.append(f"  Domain: {alert['hostname']}")
            body_lines.append(f"  Status: {alert['status']}")
            body_lines.append(f"  Expires: {alert.get('not_after', 'N/A')}")
            body_lines.append(f"  Days Remaining: {alert.get('days_remaining', 'N/A')}")
            if alert.get("error"):
                body_lines.append(f"  Error: {alert['error']}")
            body_lines.append("")

        message = "\n".join(body_lines)

        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=subject[:100],
            Message=message,
        )
        logger.info("SNS alert sent to %s", sns_topic_arn)
        return True

    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to send SNS alert: %s", exc)
        return False


def load_domains_from_file(filepath: str) -> list[str]:
    """Load domain list from a file (one domain per line)."""
    domains: list[str] = []
    try:
        with open(filepath, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line and not line.startswith("#"):
                    domains.append(line)
    except OSError as exc:
        logger.error("Failed to read domains file %s: %s", filepath, exc)
    return domains


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Monitor SSL certificate expiry for domains.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s --domains example.com google.com github.com
  %(prog)s --domains-file domains.txt --warn-days 30
  %(prog)s --domains example.com --sns-topic arn:aws:sns:us-east-1:123:alerts
  %(prog)s --domains example.com --json
        """,
    )
    domain_group = parser.add_mutually_exclusive_group(required=True)
    domain_group.add_argument("--domains", nargs="+", help="Domains to check")
    domain_group.add_argument("--domains-file", metavar="FILE", help="File with domains (one per line)")

    parser.add_argument("--port", type=int, default=443, help="TLS port (default: 443)")
    parser.add_argument("--warn-days", type=int, default=30, help="Alert if expiring within N days (default: 30)")
    parser.add_argument("--critical-days", type=int, default=7, help="Critical alert threshold in days (default: 7)")
    parser.add_argument("--timeout", type=int, default=10, help="Connection timeout in seconds (default: 10)")
    parser.add_argument("--sns-topic", metavar="ARN", help="SNS topic ARN for alerts")
    parser.add_argument("--sns-region", default="us-east-1", help="AWS region for SNS (default: us-east-1)")
    parser.add_argument("--profile", help="AWS CLI profile")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--output", metavar="FILE", help="Write results to file")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging")
    return parser


def main() -> int:
    """Run the SSL certificate monitor."""
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    domains = args.domains if args.domains else load_domains_from_file(args.domains_file)
    if not domains:
        logger.error("No domains specified")
        return 1

    logger.info("Checking SSL certificates for %d domain(s)", len(domains))

    results: list[dict[str, Any]] = []
    alerts: list[dict[str, Any]] = []

    for domain in domains:
        logger.info("Checking %s:%d...", domain, args.port)
        cert_info = get_cert_info(domain, port=args.port, timeout=args.timeout)
        results.append(cert_info)

        days = cert_info["days_remaining"]
        status = cert_info["status"]

        if status == "expired":
            cert_info["alert_level"] = "CRITICAL"
            alerts.append(cert_info)
            logger.error("EXPIRED: %s (expired %d days ago)", domain, abs(days))
        elif status in ("error", "invalid", "timeout", "dns_error"):
            cert_info["alert_level"] = "ERROR"
            alerts.append(cert_info)
            logger.error("ERROR: %s (%s: %s)", domain, status, cert_info["error"])
        elif 0 < days <= args.critical_days:
            cert_info["alert_level"] = "CRITICAL"
            alerts.append(cert_info)
            logger.warning("CRITICAL: %s expires in %d days", domain, days)
        elif 0 < days <= args.warn_days:
            cert_info["alert_level"] = "WARNING"
            alerts.append(cert_info)
            logger.warning("WARNING: %s expires in %d days", domain, days)
        else:
            cert_info["alert_level"] = "OK"
            logger.info("OK: %s (%d days remaining)", domain, days)

    if args.json:
        output = json.dumps(results, indent=2, default=str)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as fh:
                fh.write(output)
            logger.info("JSON report written to %s", args.output)
        else:
            print(output)
    else:
        print(f"\n{'=' * 70}")
        print("  SSL Certificate Monitor Report")
        print(f"  Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"{'=' * 70}")

        for r in results:
            status_icon = {"OK": "[OK]", "WARNING": "[WARN]", "CRITICAL": "[CRIT]", "ERROR": "[ERR]"}
            icon = status_icon.get(r.get("alert_level", ""), "[??]")
            print(f"\n  {icon} {r['hostname']}:{r['port']}")
            print(f"       Status:    {r['status']}")
            if r.get("not_after"):
                print(f"       Expires:   {r['not_after']}")
                print(f"       Remaining: {r['days_remaining']} days")
            if r.get("issuer"):
                print(f"       Issuer:    {r['issuer']}")
            if r.get("error"):
                print(f"       Error:     {r['error']}")

        print(f"\n{'=' * 70}")
        print(f"  Total: {len(results)} | OK: {sum(1 for r in results if r.get('alert_level') == 'OK')} | "
              f"Warnings: {sum(1 for r in results if r.get('alert_level') == 'WARNING')} | "
              f"Critical: {sum(1 for r in results if r.get('alert_level') in ('CRITICAL', 'ERROR'))}")
        print(f"{'=' * 70}\n")

    if alerts and args.sns_topic:
        send_sns_alert(args.sns_topic, args.sns_region, alerts, profile=args.profile)

    exit_code = 2 if any(a.get("alert_level") == "CRITICAL" for a in alerts) else (
        1 if alerts else 0
    )
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
