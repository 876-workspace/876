#!/usr/bin/env python3
"""Verify a deployed Billing API before granting it the writer lease."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from dataclasses import asdict, dataclass

import httpx

from domains.billing.generated_routes import ROUTES

HTTP_METHODS = {"delete", "get", "patch", "post", "put"}


@dataclass(frozen=True)
class CutoverReport:
    object: str
    valid: bool
    writer: str | None
    routes: int
    operations: int
    failures: tuple[str, ...]


async def check_cutover(
    base_url: str,
    *,
    expected_writer: str = "fastapi",
    transport: httpx.AsyncBaseTransport | None = None,
) -> CutoverReport:
    failures: list[str] = []
    writer: str | None = None
    actual_operations: set[tuple[str, str]] = set()
    try:
        async with httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=10,
            transport=transport,
        ) as client:
            health, readiness, openapi = await asyncio.gather(
                client.get("/health"),
                client.get("/ready"),
                client.get("/openapi.json"),
            )
    except httpx.HTTPError:
        failures.append("billing_api_unreachable")
        return _report(writer, actual_operations, failures)

    if health.status_code != 200 or health.json().get("status") != "ok":
        failures.append("health_check_failed")

    readiness_payload = readiness.json()
    writer = readiness_payload.get("writer")
    if readiness.status_code != 200 or readiness_payload.get("status") != "ready":
        failures.append("readiness_check_failed")
    if writer != expected_writer:
        failures.append("writer_lease_mismatch")

    if openapi.status_code != 200:
        failures.append("openapi_unavailable")
    else:
        for path, path_item in openapi.json().get("paths", {}).items():
            for method in path_item:
                if method in HTTP_METHODS:
                    actual_operations.add((path, method.upper()))
        expected_operations = {(route.path, route.method) for route in ROUTES}
        if actual_operations != expected_operations:
            failures.append("contract_operation_mismatch")

    return _report(writer, actual_operations, failures)


def _report(
    writer: str | None,
    operations: set[tuple[str, str]],
    failures: list[str],
) -> CutoverReport:
    return CutoverReport(
        object="billing_cutover_check",
        valid=not failures,
        writer=writer,
        routes=len({path for path, _method in operations}),
        operations=len(operations),
        failures=tuple(failures),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.getenv("BILLING_API_URL", ""))
    parser.add_argument("--expected-writer", default="fastapi", choices=("legacy", "fastapi", "none"))
    args = parser.parse_args()
    if not args.base_url:
        print(json.dumps(asdict(_report(None, set(), ["billing_api_url_missing"])), separators=(",", ":")))
        return 2
    report = asyncio.run(check_cutover(args.base_url, expected_writer=args.expected_writer))
    print(json.dumps(asdict(report), separators=(",", ":")))
    return 0 if report.valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
