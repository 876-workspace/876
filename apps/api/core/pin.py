"""Account PIN hashing and policy.

A PIN is not a password: four to eight digits is at most 100 million
candidates, and realistically far fewer because people pick birthdays and
repeats. Two things compensate, and both are required — an expensive KDF so
offline cracking of a stolen hash is slow, and a lockout so online guessing
cannot simply iterate.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re

SCRYPT_N = 2**15
SCRYPT_R = 8
SCRYPT_P = 1
_SALT_BYTES = 16
_KEY_LEN = 32
# scrypt needs roughly 128 * N * r bytes — 32 MiB at these parameters, which is
# exactly OpenSSL's default cap, so it must be raised explicitly or every hash
# fails with "memory limit exceeded".
_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2

MIN_LENGTH = 4
MAX_LENGTH = 8

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 900

# Repeats and straight runs are the first guesses anyone makes.
_TRIVIAL_PINS = {"0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"}


class PinPolicyError(ValueError):
    """The proposed PIN is not acceptable. The message is safe to show a user."""


def _is_sequential(pin: str) -> bool:
    ascending = all(ord(b) - ord(a) == 1 for a, b in zip(pin, pin[1:], strict=False))
    descending = all(ord(a) - ord(b) == 1 for a, b in zip(pin, pin[1:], strict=False))
    return ascending or descending


def _digit_runs(value: str) -> set[str]:
    """Every 4-to-8 digit substring of a date of birth, in any common order."""
    digits = re.sub(r"\D", "", value)
    return {
        digits[i:j]
        for i in range(len(digits))
        for j in range(i + MIN_LENGTH, min(len(digits), i + MAX_LENGTH) + 1)
    }


def validate_pin(pin: str, *, date_of_birth: str | None = None) -> None:
    """Raises `PinPolicyError` when the PIN is unacceptable.

    Rejecting the user's own date of birth matters more than it looks: it is
    the single most common real-world PIN, and it is derivable from data the
    platform already stores about them.
    """
    if not pin.isdigit():
        raise PinPolicyError("A PIN must contain digits only.")

    if not MIN_LENGTH <= len(pin) <= MAX_LENGTH:
        raise PinPolicyError(f"A PIN must be between {MIN_LENGTH} and {MAX_LENGTH} digits.")

    if len(set(pin)) == 1:
        raise PinPolicyError("A PIN must not be a single repeated digit.")

    if pin in _TRIVIAL_PINS or _is_sequential(pin):
        raise PinPolicyError("A PIN must not be a simple sequence.")

    if date_of_birth and pin in _digit_runs(date_of_birth):
        raise PinPolicyError("A PIN must not be based on your date of birth.")


def hash_pin(pin: str) -> str:
    """`scrypt$n$r$p$salt$hash`, all base64, salt generated per row."""
    salt = os.urandom(_SALT_BYTES)
    derived = hashlib.scrypt(
        pin.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=_KEY_LEN, maxmem=_MAXMEM
    )
    return "$".join(
        [
            "scrypt",
            str(SCRYPT_N),
            str(SCRYPT_R),
            str(SCRYPT_P),
            base64.b64encode(salt).decode("ascii"),
            base64.b64encode(derived).decode("ascii"),
        ]
    )


def verify_pin(pin: str, stored: str) -> bool:
    """Constant-time comparison against a stored hash.

    Parameters are read back from the stored string rather than the constants
    above, so raising the cost later does not invalidate existing hashes.
    """
    try:
        algorithm, n_raw, r_raw, p_raw, salt_b64, hash_b64 = stored.split("$")
        if algorithm != "scrypt":
            return False
        derived = hashlib.scrypt(
            pin.encode("utf-8"),
            salt=base64.b64decode(salt_b64),
            n=int(n_raw),
            r=int(r_raw),
            p=int(p_raw),
            dklen=len(base64.b64decode(hash_b64)),
            maxmem=_MAXMEM,
        )
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(derived, base64.b64decode(hash_b64))


def is_locked(locked_until: int | None, now: int) -> bool:
    return locked_until is not None and locked_until > now
