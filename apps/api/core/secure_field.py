"""Envelope encryption for individual sensitive columns.

One abstraction, two providers: WorkOS Vault in production, AES-256-GCM under a
local key for development and tests. The provider is chosen by settings so a
developer never needs Vault credentials to run the app, and the stored
ciphertext carries a provider prefix so a future migration can tell the two
formats apart without guessing.

The ``context`` map is **authenticated associated data**, not metadata. It is
always ``{"user_id": ..., "type": ...}``, which binds the ciphertext to the row
that owns it: a value copied onto another user's record fails to decrypt rather
than silently disclosing under the wrong identity. Both providers must
authenticate it, and neither may treat it as optional.
"""

from __future__ import annotations

import base64
import json
import os
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Protocol

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from core.config import Settings

WORKOS_VAULT_PREFIX = "wv1:"
LOCAL_AESGCM_PREFIX = "la1:"

_NONCE_BYTES = 12
_KEY_BYTES = 32


class SecureFieldError(RuntimeError):
    """Sealing or unsealing failed. Never carries the plaintext."""


@dataclass(frozen=True)
class SealedValue:
    ciphertext: str
    key_id: str | None
    provider: str


class SecureFieldProvider(Protocol):
    async def seal(self, plaintext: str, *, context: Mapping[str, str]) -> SealedValue: ...

    async def unseal(self, sealed: SealedValue, *, context: Mapping[str, str]) -> str: ...


def _encode_context(context: Mapping[str, str]) -> bytes:
    """Serializes the AAD deterministically.

    Sorted keys and separators without whitespace mean the same context always
    produces the same bytes — otherwise a value sealed today would fail to
    unseal tomorrow purely because a dict iterated differently.
    """
    if not context:
        raise SecureFieldError("A secure field context is required.")
    return json.dumps(dict(sorted(context.items())), separators=(",", ":")).encode("utf-8")


def _b64encode(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.b64decode(value.encode("ascii"))


class LocalAesGcmProvider:
    """AES-256-GCM under a single local key from ``SECURE_FIELD_KEY``.

    Used for development and tests. It is a real cipher, not a stub: the point
    is that dev and production differ in key custody, not in whether the value
    is encrypted at all.
    """

    provider = "local_aesgcm"

    def __init__(self, key: bytes, key_id: str | None = None) -> None:
        if len(key) != _KEY_BYTES:
            raise SecureFieldError("SECURE_FIELD_KEY must decode to exactly 32 bytes.")
        self._aesgcm = AESGCM(key)
        self._key_id = key_id

    async def seal(self, plaintext: str, *, context: Mapping[str, str]) -> SealedValue:
        aad = _encode_context(context)
        nonce = os.urandom(_NONCE_BYTES)
        ciphertext = self._aesgcm.encrypt(nonce, plaintext.encode("utf-8"), aad)
        return SealedValue(
            ciphertext=f"{LOCAL_AESGCM_PREFIX}{_b64encode(nonce)}.{_b64encode(ciphertext)}",
            key_id=self._key_id,
            provider=self.provider,
        )

    async def unseal(self, sealed: SealedValue, *, context: Mapping[str, str]) -> str:
        aad = _encode_context(context)
        body = sealed.ciphertext.removeprefix(LOCAL_AESGCM_PREFIX)
        try:
            nonce_b64, ciphertext_b64 = body.split(".", 1)
            plaintext = self._aesgcm.decrypt(_b64decode(nonce_b64), _b64decode(ciphertext_b64), aad)
        except InvalidTag as exc:
            # Wrong context or tampered ciphertext — indistinguishable by design.
            raise SecureFieldError("The sealed value could not be decrypted.") from exc
        except (ValueError, TypeError) as exc:
            raise SecureFieldError("The sealed value is malformed.") from exc
        return plaintext.decode("utf-8")


class WorkOSVaultProvider:
    """WorkOS Vault data-key encryption.

    The plaintext never leaves this process unencrypted except in the disclosure
    path, and the key material never enters it at all.
    """

    provider = "workos_vault"

    def __init__(self, client: object, key_context: str = "876") -> None:
        self._client = client
        self._key_context = key_context

    def _context(self, context: Mapping[str, str]) -> dict[str, str]:
        return {"namespace": self._key_context, **dict(sorted(context.items()))}

    async def seal(self, plaintext: str, *, context: Mapping[str, str]) -> SealedValue:
        _encode_context(context)
        encrypt = getattr(self._client, "encrypt", None)
        if encrypt is None:
            raise SecureFieldError("The Vault client cannot encrypt.")
        result = await encrypt(plaintext, context=self._context(context))
        ciphertext = result["ciphertext"] if isinstance(result, dict) else str(result)
        key_id = result.get("key_id") if isinstance(result, dict) else None
        return SealedValue(
            ciphertext=f"{WORKOS_VAULT_PREFIX}{ciphertext}",
            key_id=key_id,
            provider=self.provider,
        )

    async def unseal(self, sealed: SealedValue, *, context: Mapping[str, str]) -> str:
        _encode_context(context)
        decrypt = getattr(self._client, "decrypt", None)
        if decrypt is None:
            raise SecureFieldError("The Vault client cannot decrypt.")
        body = sealed.ciphertext.removeprefix(WORKOS_VAULT_PREFIX)
        plaintext = await decrypt(body, context=self._context(context))
        return str(plaintext)


class _UnconfiguredProvider:
    """The provider used when nothing is configured.

    It raises on seal. Storing plaintext because a key is missing would be the
    worst possible failure mode — it looks like success and leaves unencrypted
    identifiers in the database — so a misconfiguration must be loud.
    """

    provider = "unconfigured"

    async def seal(self, plaintext: str, *, context: Mapping[str, str]) -> SealedValue:
        raise SecureFieldError(
            "No secure field provider is configured. Set SECURE_FIELD_KEY or enable WORKOS_VAULT_ENABLED."
        )

    async def unseal(self, sealed: SealedValue, *, context: Mapping[str, str]) -> str:
        raise SecureFieldError("No secure field provider is configured.")


def get_secure_field_provider(settings: Settings, *, vault_client: object | None = None) -> SecureFieldProvider:
    if settings.workos_vault_enabled and vault_client is not None:
        return WorkOSVaultProvider(vault_client, key_context=settings.workos_vault_key_context)

    raw_key = settings.secure_field_key
    if raw_key:
        try:
            key = base64.b64decode(raw_key.encode("ascii"))
        except (ValueError, TypeError) as exc:
            raise SecureFieldError("SECURE_FIELD_KEY must be valid base64.") from exc
        return LocalAesGcmProvider(key)

    return _UnconfiguredProvider()


def provider_for_ciphertext(ciphertext: str) -> str:
    """Names the provider that produced a stored value, from its prefix alone."""
    if ciphertext.startswith(WORKOS_VAULT_PREFIX):
        return "workos_vault"
    if ciphertext.startswith(LOCAL_AESGCM_PREFIX):
        return "local_aesgcm"
    return "unknown"
