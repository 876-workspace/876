"""Sealing, masking and duplicate-matching for sensitive identifiers.

Every write path goes through :func:`seal_identification_value`, and every read
path outside the disclosure endpoint uses the stored ``value_last4`` rather than
the plaintext. The point of putting all three operations in one module is that
"how a TRN is stored" has exactly one implementation to audit.
"""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass

from core.config import Settings
from core.secure_field import SealedValue, SecureFieldError, get_secure_field_provider


@dataclass(frozen=True)
class SealedIdentification:
    ciphertext: str
    key_id: str | None
    provider: str
    last4: str
    value_hash: str


def compute_identification_hash(settings: Settings, identification_type: str, normalized_value: str) -> str:
    """HMAC-SHA256 of the normalized value under the server pepper.

    A plain hash of a TRN is brute-forceable — the space is small enough to
    enumerate — so the pepper is what stops a database copy from being reversed
    offline. It is keyed by type as well, so the same digits under two
    identifier types do not collide into a false duplicate.
    """
    pepper = settings.identification_hash_pepper
    if not pepper:
        raise SecureFieldError("IDENTIFICATION_HASH_PEPPER is not configured.")
    message = f"{identification_type}:{normalized_value}".encode()
    return hmac.new(pepper.encode("utf-8"), message, hashlib.sha256).hexdigest()


async def seal_identification_value(
    settings: Settings,
    *,
    user_id: str,
    identification_type: str,
    normalized_value: str,
    vault_client: object | None = None,
) -> SealedIdentification:
    provider = get_secure_field_provider(settings, vault_client=vault_client)
    sealed = await provider.seal(
        normalized_value,
        context={"user_id": user_id, "type": identification_type},
    )
    return SealedIdentification(
        ciphertext=sealed.ciphertext,
        key_id=sealed.key_id,
        provider=sealed.provider,
        last4=normalized_value[-4:],
        value_hash=compute_identification_hash(settings, identification_type, normalized_value),
    )


async def disclose_identification_value(
    settings: Settings,
    row: object,
    *,
    vault_client: object | None = None,
) -> str:
    """Returns the raw value. Only the entitlement-gated disclosure route may call this.

    Legacy rows that predate encryption still carry plaintext in ``value``; they
    are returned as-is so disclosure keeps working during the backfill window.
    """
    ciphertext = getattr(row, "value_ciphertext", None)
    if not ciphertext:
        legacy = getattr(row, "value", None)
        if legacy:
            return str(legacy)
        raise SecureFieldError("The identification has no stored value.")

    provider = get_secure_field_provider(settings, vault_client=vault_client)
    return await provider.unseal(
        SealedValue(
            ciphertext=str(ciphertext),
            key_id=getattr(row, "value_key_id", None),
            provider=str(getattr(row, "value_provider", "") or ""),
        ),
        context={"user_id": str(row.user_id), "type": str(row.type)},  # type: ignore[attr-defined]
    )


MASK_WIDTH = 4


def masked_identification_value(row: object) -> str:
    """The only value shape a list/retrieve response may carry.

    Reveals the last three characters behind a **fixed-width** mask, matching
    the existing `mask_identification_value` convention on what is revealed but
    not on the mask's length. A bullet run as long as the value discloses the
    identifier's length, which is itself a distinguishing detail — a nine-digit
    TRN and a six-character passport should not be told apart from a masked
    read.

    Uses the stored last four so masking never needs the decryption key, and
    falls back to the legacy plaintext while un-backfilled rows exist.
    """
    last4 = getattr(row, "value_last4", None)
    if not last4:
        legacy = getattr(row, "value", None)
        if not legacy:
            return ""
        last4 = str(legacy)[-4:]

    tail = str(last4)[-3:]
    return f"{'•' * MASK_WIDTH}{tail}"
