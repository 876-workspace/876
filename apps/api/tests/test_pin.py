"""Account PIN hashing and policy."""

from __future__ import annotations

import pytest

from core.pin import (
    LOCKOUT_SECONDS,
    MAX_FAILED_ATTEMPTS,
    PinPolicyError,
    hash_pin,
    is_locked,
    validate_pin,
    verify_pin,
)


class TestHashPin:
    def test_verifies_the_correct_pin(self) -> None:
        stored = hash_pin("8213")

        assert verify_pin("8213", stored) is True

    def test_rejects_an_incorrect_pin(self) -> None:
        stored = hash_pin("8213")

        assert verify_pin("8214", stored) is False

    def test_never_stores_the_pin_in_the_hash(self) -> None:
        stored = hash_pin("8213")

        assert "8213" not in stored

    def test_uses_a_fresh_salt_for_every_hash(self) -> None:
        assert hash_pin("8213") != hash_pin("8213")

    def test_records_the_algorithm_and_parameters(self) -> None:
        stored = hash_pin("8213")

        algorithm, n_raw, r_raw, p_raw, _salt, _hash = stored.split("$")
        assert algorithm == "scrypt"
        assert int(n_raw) == 2**15
        assert int(r_raw) == 8
        assert int(p_raw) == 1

    @pytest.mark.parametrize(
        "stored",
        [
            "",
            "not-a-hash",
            "scrypt$bad",
            "argon2$32768$8$1$c2FsdA==$aGFzaA==",
            "scrypt$notanumber$8$1$c2FsdA==$aGFzaA==",
        ],
    )
    def test_rejects_a_malformed_stored_hash_without_raising(self, stored: str) -> None:
        assert verify_pin("8213", stored) is False

    def test_verifies_against_parameters_read_from_the_stored_hash(self) -> None:
        """A cheaper historical hash must still verify after the cost is raised."""
        import base64
        import hashlib

        salt = b"s" * 16
        derived = hashlib.scrypt(b"8213", salt=salt, n=2**14, r=8, p=1, dklen=32)
        stored = "$".join(
            ["scrypt", "16384", "8", "1", base64.b64encode(salt).decode(), base64.b64encode(derived).decode()]
        )

        assert verify_pin("8213", stored) is True


class TestValidatePin:
    @pytest.mark.parametrize("pin", ["8213", "90247", "4820613", "51739284"])
    def test_accepts_a_reasonable_pin(self, pin: str) -> None:
        validate_pin(pin)

    @pytest.mark.parametrize("pin", ["123", "912345678", ""])
    def test_rejects_a_pin_of_the_wrong_length(self, pin: str) -> None:
        with pytest.raises(PinPolicyError):
            validate_pin(pin)

    @pytest.mark.parametrize("pin", ["12a4", "8 13", "abcd", "82.1"])
    def test_rejects_a_pin_that_is_not_all_digits(self, pin: str) -> None:
        with pytest.raises(PinPolicyError):
            validate_pin(pin)

    @pytest.mark.parametrize("pin", ["0000", "1111", "9999", "22222"])
    def test_rejects_a_repeated_digit(self, pin: str) -> None:
        with pytest.raises(PinPolicyError):
            validate_pin(pin)

    @pytest.mark.parametrize("pin", ["1234", "2345", "4321", "98765"])
    def test_rejects_an_ascending_or_descending_run(self, pin: str) -> None:
        with pytest.raises(PinPolicyError):
            validate_pin(pin)

    @pytest.mark.parametrize("pin", ["1990", "0714", "19900714"])
    def test_rejects_a_pin_taken_from_the_users_date_of_birth(self, pin: str) -> None:
        """The most common real PIN, and derivable from data we already hold."""
        with pytest.raises(PinPolicyError):
            validate_pin(pin, date_of_birth="1990-07-14")

    def test_allows_an_unrelated_pin_when_a_date_of_birth_is_known(self) -> None:
        validate_pin("8213", date_of_birth="1990-07-14")

    def test_ignores_an_empty_date_of_birth(self) -> None:
        validate_pin("8213", date_of_birth=None)


class TestLockout:
    def test_is_not_locked_without_a_lock_timestamp(self) -> None:
        assert is_locked(None, 1_760_000_000) is False

    def test_is_locked_while_the_lock_is_in_the_future(self) -> None:
        assert is_locked(1_760_000_100, 1_760_000_000) is True

    def test_is_not_locked_once_the_lock_has_elapsed(self) -> None:
        assert is_locked(1_760_000_000, 1_760_000_100) is False

    def test_lockout_policy_values_are_meaningful(self) -> None:
        assert MAX_FAILED_ATTEMPTS == 5
        assert LOCKOUT_SECONDS == 900
