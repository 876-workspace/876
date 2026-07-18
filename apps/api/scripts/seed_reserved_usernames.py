"""Seed script: populates the reserved_usernames table with system, support,
routing, legal, brand, and technical handles that must never be claimed.

Run once per environment (idempotent — skips already-reserved names):
    python scripts/seed_reserved_usernames.py
"""
# ruff: noqa: E402
from __future__ import annotations

import asyncio
import os
import sys

_api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_root)

from dotenv import load_dotenv

load_dotenv(os.path.join(_api_root, ".env.development"), override=False)
load_dotenv(os.path.join(_api_root, ".env"), override=False)

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from core.timestamps import now_unix_seconds
from db.models import ReservedUsername

# ---------------------------------------------------------------------------
# Reserved username catalog
# ---------------------------------------------------------------------------

_RESERVED: list[tuple[str, str]] = [
    # Administrative & system handles
    ("admin", "Administrative handle — impersonation risk"),
    ("administrator", "Administrative handle — impersonation risk"),
    ("admins", "Administrative handle — impersonation risk"),
    ("root", "System-level handle — impersonation risk"),
    ("superuser", "System-level handle — impersonation risk"),
    ("su", "System-level handle — impersonation risk"),
    ("sysadmin", "System-level handle — impersonation risk"),
    ("system", "System-level handle — impersonation risk"),
    ("sys", "System-level handle — impersonation risk"),
    ("webmaster", "System-level handle — impersonation risk"),
    ("hostmaster", "System-level handle — impersonation risk"),
    ("mod", "Moderator handle — impersonation risk"),
    ("moderator", "Moderator handle — impersonation risk"),
    ("mods", "Moderator handle — impersonation risk"),
    ("staff", "Staff handle — impersonation risk"),
    ("employee", "Staff handle — impersonation risk"),
    ("team", "Staff handle — impersonation risk"),
    ("crew", "Staff handle — impersonation risk"),
    ("owner", "Ownership handle — impersonation risk"),
    ("founder", "Ownership handle — impersonation risk"),
    ("ceo", "Executive handle — impersonation risk"),
    # Support, contact & billing
    ("support", "Support channel — trust exploitation risk"),
    ("help", "Support channel — trust exploitation risk"),
    ("helpdesk", "Support channel — trust exploitation risk"),
    ("contact", "Contact channel — trust exploitation risk"),
    ("contactus", "Contact channel — trust exploitation risk"),
    ("info", "Generic info channel — trust exploitation risk"),
    ("inquiries", "Contact channel — trust exploitation risk"),
    ("billing", "Billing channel — trust exploitation risk"),
    ("sales", "Sales channel — trust exploitation risk"),
    ("payments", "Payments channel — trust exploitation risk"),
    ("accounts", "Accounts channel — trust exploitation risk"),
    ("accounting", "Accounting channel — trust exploitation risk"),
    ("service", "Service channel — trust exploitation risk"),
    ("customerservice", "Customer service channel — trust exploitation risk"),
    ("cs", "Customer service abbreviation — trust exploitation risk"),
    ("feedback", "Feedback channel — trust exploitation risk"),
    ("suggestions", "Feedback channel — trust exploitation risk"),
    ("bugs", "Bug-report channel — trust exploitation risk"),
    # Legal, security & policy
    ("security", "Security channel — trust exploitation risk"),
    ("abuse", "Abuse reporting channel — trust exploitation risk"),
    ("privacy", "Privacy channel — trust exploitation risk"),
    ("legal", "Legal channel — trust exploitation risk"),
    ("compliance", "Compliance channel — trust exploitation risk"),
    ("copyright", "Legal channel — trust exploitation risk"),
    ("dmca", "Legal channel — trust exploitation risk"),
    ("terms", "Policy channel — trust exploitation risk"),
    ("policy", "Policy channel — trust exploitation risk"),
    ("tos", "Terms of service abbreviation — trust exploitation risk"),
    ("postmaster", "Mail administration handle — routing conflict"),
    ("mailer-daemon", "Mail administration handle — routing conflict"),
    # Web routing & technical handles
    ("api", "URL routing conflict — technical reservation"),
    ("app", "URL routing conflict — technical reservation"),
    ("web", "URL routing conflict — technical reservation"),
    ("www", "URL routing conflict — technical reservation"),
    ("ww2", "Subdomain variant — URL routing conflict"),
    ("ww3", "Subdomain variant — URL routing conflict"),
    ("ftp", "URL routing conflict — technical reservation"),
    ("mail", "URL routing conflict — technical reservation"),
    ("pop", "Mail protocol handle — technical reservation"),
    ("imap", "Mail protocol handle — technical reservation"),
    ("smtp", "Mail protocol handle — technical reservation"),
    ("dns", "DNS handle — technical reservation"),
    ("ns1", "DNS nameserver handle — technical reservation"),
    ("ns2", "DNS nameserver handle — technical reservation"),
    ("rss", "Feed handle — technical reservation"),
    ("xml", "Format handle — technical reservation"),
    ("html", "Format handle — technical reservation"),
    ("ssl", "Protocol handle — technical reservation"),
    ("auth", "Authentication route — URL routing conflict"),
    ("login", "Authentication route — URL routing conflict"),
    ("logout", "Authentication route — URL routing conflict"),
    ("register", "Registration route — URL routing conflict"),
    ("signup", "Registration route — URL routing conflict"),
    ("settings", "App route — URL routing conflict"),
    ("dashboard", "App route — URL routing conflict"),
    ("profile", "App route — URL routing conflict"),
    ("account", "App route — URL routing conflict"),
    ("status", "App route — URL routing conflict"),
    ("docs", "App route — URL routing conflict"),
    ("developers", "App route — URL routing conflict"),
    ("pricing", "App route — URL routing conflict"),
    ("jobs", "App route — URL routing conflict"),
    ("careers", "App route — URL routing conflict"),
    ("faq", "App route — URL routing conflict"),
    ("helpcenter", "App route — URL routing conflict"),
    ("shop", "App route — URL routing conflict"),
    ("store", "App route — URL routing conflict"),
    ("download", "App route — URL routing conflict"),
    ("invite", "App route — URL routing conflict"),
    # Code/JS reserved words & development handles
    ("null", "JS reserved word — edge case risk"),
    ("undefined", "JS reserved word — edge case risk"),
    ("void", "JS reserved word — edge case risk"),
    ("anonymous", "Anonymous handle — moderation risk"),
    ("false", "JS reserved word — edge case risk"),
    ("true", "JS reserved word — edge case risk"),
    ("test", "Development handle — environment confusion risk"),
    ("tester", "Development handle — environment confusion risk"),
    ("demo", "Development handle — environment confusion risk"),
    ("guest", "Generic placeholder — moderation risk"),
    ("bot", "Automated account indicator — moderation risk"),
    ("robot", "Automated account indicator — moderation risk"),
    ("dev", "Development handle — environment confusion risk"),
    ("development", "Development handle — environment confusion risk"),
    ("staging", "Development handle — environment confusion risk"),
    ("prod", "Production handle — environment confusion risk"),
    ("production", "Production handle — environment confusion risk"),
    # Brand & marketing
    ("official", "Brand handle — impersonation risk"),
    ("verified", "Brand handle — impersonation risk"),
    ("premium", "Brand handle — impersonation risk"),
    ("pro", "Brand handle — impersonation risk"),
    ("press", "Media channel — impersonation risk"),
    ("media", "Media channel — impersonation risk"),
    ("news", "Media channel — impersonation risk"),
    ("blog", "Brand content channel — impersonation risk"),
    ("marketing", "Brand channel — impersonation risk"),
    ("pr", "PR abbreviation — impersonation risk"),
    # 876-specific brand names
    ("876", "Platform brand — impersonation risk"),
    ("efesto", "Company name — impersonation risk"),
]


def _build_engine_url(raw: str) -> tuple[str, dict]:
    url = raw
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    connect_args: dict = {}
    if "?" in url:
        base_url, query = url.split("?", 1)
        if "sslmode=require" in query or "ssl=require" in query:
            connect_args["ssl"] = True
        url = base_url
    return url, connect_args


async def main() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set.")
        sys.exit(1)

    url, connect_args = _build_engine_url(db_url)
    engine = create_async_engine(url, connect_args=connect_args, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)  # type: ignore[call-overload]

    added = 0
    skipped = 0
    now = now_unix_seconds()

    async with async_session() as session:
        for username, reason in _RESERVED:
            existing = await session.get(ReservedUsername, username)
            if existing:
                skipped += 1
                continue
            session.add(ReservedUsername(username=username, reason=reason, created_at=now))
            added += 1
        await session.commit()

    await engine.dispose()
    print(f"Done. Added {added} reserved usernames, skipped {skipped} already-reserved.")


if __name__ == "__main__":
    asyncio.run(main())
