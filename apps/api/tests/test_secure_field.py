"""Secure-field envelope encryption.

The properties under test are the ones that make this safe rather than merely
working: context binding (a value cannot be decrypted under a different owner),
tamper detection, provider routing by prefix, and — most importantly — that a
missing key raises instead of silently storing plaintext.
"""

from __future__ import annotations

import base64
from typing import Any

import pytest

from core.config import Settings
from core.secure_field import (
    LOCAL_AESGCM_PREFIX,
    WORKOS_VAULT_PREFIX,
    LocalAesGcmProvider,
    SealedValue,
    SecureFieldError,
    WorkOSVaultProvider,
    get_secure_field_provider,
    provider_for_ciphertext,
)

TRN = "123-456-789"
CONTEXT = {"user_id": "user_2kL9mN4q", "type": "trn"}
OTHER_CONTEXT = {"user_id": "user_9zZ8yY7x", "type": "trn"}


def _key(byte: int = 7) -> str:
    return base64.b64encode(bytes([byte]) * 32).decode("ascii")


def _local() -> LocalAesGcmProvider:
    return LocalAesGcmProvider(base64.b64decode(_key()))


class TestLocalAesGcmProvider:
    async def test_round_trips_a_value_under_the_same_context(self) -> None:
        provider = _local()

        sealed = await provider.seal(TRN, context=CONTEXT)

        assert await provider.unseal(sealed, context=CONTEXT) == TRN

    async def test_ciphertext_never_contains_the_plaintext(self) -> None:
        provider = _local()

        sealed = await provider.seal(TRN, context=CONTEXT)

        assert TRN not in sealed.ciphertext
        assert "123" not in sealed.ciphertext

    async def test_carries_the_local_provider_prefix(self) -> None:
        provider = _local()

        sealed = await provider.seal(TRN, context=CONTEXT)

        assert sealed.ciphertext.startswith(LOCAL_AESGCM_PREFIX)
        assert sealed.provider == "local_aesgcm"

    async def test_uses_a_fresh_nonce_for_every_seal(self) -> None:
        provider = _local()

        first = await provider.seal(TRN, context=CONTEXT)
        second = await provider.seal(TRN, context=CONTEXT)

        assert first.ciphertext != second.ciphertext

    async def test_refuses_to_decrypt_under_a_different_user(self) -> None:
        """The property that makes a copied row useless to an attacker."""
        provider = _local()
        sealed = await provider.seal(TRN, context=CONTEXT)

        with pytest.raises(SecureFieldError):
            await provider.unseal(sealed, context=OTHER_CONTEXT)

    async def test_refuses_to_decrypt_under_a_different_type(self) -> None:
        provider = _local()
        sealed = await provider.seal(TRN, context=CONTEXT)

        with pytest.raises(SecureFieldError):
            await provider.unseal(sealed, context={"user_id": "user_2kL9mN4q", "type": "passport"})

    async def test_rejects_a_tampered_ciphertext(self) -> None:
        provider = _local()
        sealed = await provider.seal(TRN, context=CONTEXT)
        nonce, body = sealed.ciphertext.removeprefix(LOCAL_AESGCM_PREFIX).split(".", 1)
        flipped = body[:-2] + ("AA" if body[-2:] != "AA" else "BB")

        with pytest.raises(SecureFieldError):
            await provider.unseal(
                SealedValue(f"{LOCAL_AESGCM_PREFIX}{nonce}.{flipped}", None, "local_aesgcm"),
                context=CONTEXT,
            )

    async def test_rejects_a_malformed_ciphertext(self) -> None:
        provider = _local()

        with pytest.raises(SecureFieldError):
            await provider.unseal(
                SealedValue(f"{LOCAL_AESGCM_PREFIX}not-a-sealed-value", None, "local_aesgcm"), context=CONTEXT
            )

    async def test_rejects_an_empty_context(self) -> None:
        provider = _local()

        with pytest.raises(SecureFieldError):
            await provider.seal(TRN, context={})

    async def test_rejects_a_key_of_the_wrong_length(self) -> None:
        with pytest.raises(SecureFieldError):
            LocalAesGcmProvider(b"too-short")

    async def test_context_ordering_does_not_affect_decryption(self) -> None:
        """Sealing and unsealing with differently ordered dicts must agree."""
        provider = _local()

        sealed = await provider.seal(TRN, context={"user_id": "user_2kL9mN4q", "type": "trn"})

        assert await provider.unseal(sealed, context={"type": "trn", "user_id": "user_2kL9mN4q"}) == TRN


class _FakeVaultClient:
    def __init__(self) -> None:
        self.encrypt_calls: list[dict[str, Any]] = []
        self.decrypt_calls: list[dict[str, Any]] = []

    async def encrypt(self, plaintext: str, *, context: dict[str, str]) -> dict[str, str]:
        self.encrypt_calls.append({"plaintext": plaintext, "context": context})
        return {"ciphertext": f"vault({plaintext})", "key_id": "key_2kL9mN4q"}

    async def decrypt(self, ciphertext: str, *, context: dict[str, str]) -> str:
        self.decrypt_calls.append({"ciphertext": ciphertext, "context": context})
        return ciphertext.removeprefix("vault(").removesuffix(")")


class TestWorkOSVaultProvider:
    async def test_round_trips_through_the_vault_client(self) -> None:
        provider = WorkOSVaultProvider(_FakeVaultClient())

        sealed = await provider.seal(TRN, context=CONTEXT)

        assert sealed.ciphertext.startswith(WORKOS_VAULT_PREFIX)
        assert sealed.provider == "workos_vault"
        assert sealed.key_id == "key_2kL9mN4q"

    async def test_passes_the_context_as_the_encryption_context(self) -> None:
        client = _FakeVaultClient()
        provider = WorkOSVaultProvider(client, key_context="876")

        await provider.seal(TRN, context=CONTEXT)

        assert client.encrypt_calls[0]["context"] == {
            "namespace": "876",
            "type": "trn",
            "user_id": "user_2kL9mN4q",
        }

    async def test_strips_the_prefix_before_calling_decrypt(self) -> None:
        client = _FakeVaultClient()
        provider = WorkOSVaultProvider(client)
        sealed = await provider.seal(TRN, context=CONTEXT)

        plaintext = await provider.unseal(sealed, context=CONTEXT)

        assert plaintext == TRN
        assert not client.decrypt_calls[0]["ciphertext"].startswith(WORKOS_VAULT_PREFIX)

    async def test_rejects_an_empty_context(self) -> None:
        provider = WorkOSVaultProvider(_FakeVaultClient())

        with pytest.raises(SecureFieldError):
            await provider.seal(TRN, context={})


class TestProviderSelection:
    def test_uses_the_local_provider_when_only_a_key_is_set(self) -> None:
        provider = get_secure_field_provider(Settings(secure_field_key=_key()))

        assert isinstance(provider, LocalAesGcmProvider)

    def test_uses_vault_when_enabled_and_a_client_is_supplied(self) -> None:
        provider = get_secure_field_provider(
            Settings(workos_vault_enabled=True, secure_field_key=_key()),
            vault_client=_FakeVaultClient(),
        )

        assert isinstance(provider, WorkOSVaultProvider)

    def test_falls_back_to_the_local_key_when_vault_has_no_client(self) -> None:
        provider = get_secure_field_provider(Settings(workos_vault_enabled=True, secure_field_key=_key()))

        assert isinstance(provider, LocalAesGcmProvider)

    def test_rejects_a_non_base64_key(self) -> None:
        with pytest.raises(SecureFieldError):
            get_secure_field_provider(Settings(secure_field_key="not base64!!"))


class TestUnconfiguredProvider:
    async def test_sealing_raises_rather_than_storing_plaintext(self) -> None:
        """The single most important assertion in this file.

        A misconfiguration must fail loudly. Falling back to plaintext would
        look like success while leaving unencrypted identifiers in the database.
        """
        provider = get_secure_field_provider(Settings())

        with pytest.raises(SecureFieldError):
            await provider.seal(TRN, context=CONTEXT)

    async def test_unsealing_raises(self) -> None:
        provider = get_secure_field_provider(Settings())

        with pytest.raises(SecureFieldError):
            await provider.unseal(SealedValue("la1:x.y", None, "local_aesgcm"), context=CONTEXT)


class TestProviderForCiphertext:
    @pytest.mark.parametrize(
        ("ciphertext", "expected"),
        [
            ("wv1:abc", "workos_vault"),
            ("la1:abc.def", "local_aesgcm"),
            ("legacy-plaintext", "unknown"),
        ],
    )
    def test_names_the_provider_from_the_prefix(self, ciphertext: str, expected: str) -> None:
        assert provider_for_ciphertext(ciphertext) == expected
