"""Seal existing plaintext identification values.

Dry-run by default; `--apply` writes. Idempotent — a row that already has
ciphertext is skipped, so a failed run can simply be repeated.

The plaintext `value` column is only cleared with `--clear-plaintext`, and that
should be a separate, later run: seal everything first, verify disclosure still
works against the sealed column, and only then drop the original. Clearing in
the same pass leaves no way back if the key was misconfigured.

    python scripts/encrypt_user_identifications.py            # report only
    python scripts/encrypt_user_identifications.py --apply
    python scripts/encrypt_user_identifications.py --apply --clear-plaintext
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from core.config import get_settings  # noqa: E402
from core.identifications import normalize_identification_value  # noqa: E402
from core.secure_field import SecureFieldError  # noqa: E402
from core.timestamps import now_unix_seconds  # noqa: E402
from db.models import UserIdentification  # noqa: E402
from db.session import AsyncSessionLocal, _make_engine  # noqa: E402
from services.identification_secrets import seal_identification_value  # noqa: E402


async def _run(*, apply: bool, clear_plaintext: bool) -> int:
    settings = get_settings()
    sealed_count = 0
    skipped = 0
    failed = 0

    engine = _make_engine(settings.database_url)
    AsyncSessionLocal.configure(bind=engine)

    async with AsyncSessionLocal() as db:
        rows = list((await db.scalars(select(UserIdentification))).all())

        for row in rows:
            if row.value_ciphertext:
                skipped += 1
                if clear_plaintext and apply and row.value:
                    row.value = ""
                continue

            if not row.value:
                skipped += 1
                continue

            normalized = normalize_identification_value(row.type, row.value)
            try:
                sealed = await seal_identification_value(
                    settings,
                    user_id=row.user_id,
                    identification_type=row.type,
                    normalized_value=normalized,
                )
            except SecureFieldError as exc:
                # Never fall back to leaving the row unencrypted silently.
                print(f"  FAILED {row.id}: {exc}")
                failed += 1
                continue

            print(f"  seal {row.id} (user={row.user_id} type={row.type})")
            sealed_count += 1

            if apply:
                row.value_ciphertext = sealed.ciphertext
                row.value_key_id = sealed.key_id
                row.value_provider = sealed.provider
                row.value_last4 = sealed.last4
                row.value_hash = sealed.value_hash
                row.updated_at = now_unix_seconds()
                if clear_plaintext:
                    row.value = ""

        if apply:
            await db.commit()

    mode = "applied" if apply else "dry run"
    print(f"\n{mode}: {sealed_count} sealed, {skipped} skipped, {failed} failed")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write the sealed values")
    parser.add_argument(
        "--clear-plaintext",
        action="store_true",
        help="also null the legacy plaintext column (run only after verifying a sealed run)",
    )
    args = parser.parse_args()

    if args.clear_plaintext and not args.apply:
        parser.error("--clear-plaintext requires --apply")

    return asyncio.run(_run(apply=args.apply, clear_plaintext=args.clear_plaintext))


if __name__ == "__main__":
    raise SystemExit(main())
