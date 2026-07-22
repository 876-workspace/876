from datetime import UTC, datetime
from decimal import Decimal

from db.reconciliation import DatabaseSnapshot, TableDigest, compare_snapshots, digest_rows


def test_digest_rows_is_deterministic_for_financial_values() -> None:
    rows = [
        {
            "id": "blinv_1",
            "amount": Decimal("10.50"),
            "issued_at": datetime(2026, 7, 22, 12, 30, tzinfo=UTC),
            "metadata": {"b": 2, "a": 1},
        }
    ]
    columns = ["id", "amount", "issued_at", "metadata"]

    first = digest_rows("billing_invoices", columns, rows)
    second = digest_rows("billing_invoices", columns, rows)

    assert first == second
    assert first.rows == 1
    assert len(first.sha256) == 64


def test_compare_snapshots_names_every_mismatch() -> None:
    source = DatabaseSnapshot(
        tables=(
            TableDigest("billing_customers", 2, "a"),
            TableDigest("billing_invoices", 1, "b"),
        )
    )
    target = DatabaseSnapshot(
        tables=(
            TableDigest("billing_customers", 2, "a"),
            TableDigest("billing_invoices", 2, "c"),
        )
    )

    report = compare_snapshots(source, target)

    assert report.matches is False
    assert report.mismatched_tables == ("billing_invoices",)
