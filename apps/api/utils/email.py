from __future__ import annotations

import os


def load_disposable_domains() -> set[str]:
    file_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "..",
            "..",
            "src",
            "lib",
            "data",
            "disposable-email-domains.txt",
        )
    )
    domains: set[str] = set()
    if not os.path.exists(file_path):
        return domains
    try:
        with open(file_path, encoding="utf-8") as f:
            for line in f:
                d = line.strip().lower()
                if d:
                    domains.add(d)
    except Exception:
        pass
    return domains


DISPOSABLE_DOMAINS: set[str] = load_disposable_domains()


def is_disposable_email_domain(email: str) -> bool:
    email = email.strip().lower()
    at_idx = email.rfind("@")
    if at_idx < 0 or at_idx == len(email) - 1:
        return False
    domain = email[at_idx + 1 :]
    if domain in DISPOSABLE_DOMAINS:
        return True
    parts = domain.split(".")
    return any(".".join(parts[idx:]) in DISPOSABLE_DOMAINS for idx in range(1, len(parts) - 1))
