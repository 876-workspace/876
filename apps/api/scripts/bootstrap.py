"""Run the API's revision-gated database bootstrap explicitly."""

# ruff: noqa: E402

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_API_ROOT))

from core.config import get_settings
from db.session import AsyncSessionLocal, _make_engine
from main import get_bootstrap_steps
from services.bootstrap import run_bootstrap


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Run selected phases even when their revisions are current.",
    )
    parser.add_argument(
        "--step",
        action="append",
        dest="steps",
        help="Run only this named phase. May be supplied more than once.",
    )
    return parser.parse_args()


async def _main() -> None:
    args = _parse_args()
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required to run the API bootstrap.")

    engine = _make_engine(settings.database_url)
    AsyncSessionLocal.configure(bind=engine)
    try:
        await run_bootstrap(
            engine,
            get_bootstrap_steps(),
            force=args.force,
            selected_steps=args.steps,
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
