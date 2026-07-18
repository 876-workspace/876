"""Unit tests for multi-account session cookie helpers in core.session."""

from core.session import (
    account_entry,
    account_identity,
    merge_accounts,
    seal_session,
    select_account,
    unseal_session,
)

SECRET = "test-secret-key"


def _user(uid: str, email: str) -> dict[str, object]:
    return {
        "id": uid,
        "email": email,
        "firstName": "Jane",
        "lastName": "Doe",
        "emailVerified": True,
        "avatar": None,
        "username": None,
    }


def test_account_identity_has_no_token() -> None:
    identity = account_identity(_user("usr_1", "a@x.com"))
    assert identity["userId"] == "usr_1"
    assert identity["email"] == "a@x.com"
    assert "accountType" not in identity
    assert "accessToken" not in identity
    assert "sid" not in identity


def test_merge_accounts_appends_new() -> None:
    a = account_entry(_user("usr_1", "a@x.com"), "ses_a")
    b = account_entry(_user("usr_2", "b@x.com"), "ses_b")
    merged = merge_accounts([a], b)
    assert [x["userId"] for x in merged] == ["usr_1", "usr_2"]
    assert merged[-1]["sid"] == "ses_b"


def test_merge_accounts_dedupes_by_user_replacing_stale_sid() -> None:
    a_old = account_entry(_user("usr_1", "a@x.com"), "ses_old")
    a_new = account_entry(_user("usr_1", "a@x.com"), "ses_new")
    merged = merge_accounts([a_old], a_new)
    assert len(merged) == 1
    assert merged[0]["sid"] == "ses_new"


def test_merge_accounts_handles_none_existing() -> None:
    entry = account_entry(_user("usr_1", "a@x.com"), "ses_a")
    assert merge_accounts(None, entry) == [entry]


def test_select_account_found_and_missing() -> None:
    a = account_entry(_user("usr_1", "a@x.com"), "ses_a")
    b = account_entry(_user("usr_2", "b@x.com"), "ses_b")
    assert select_account([a, b], "ses_b")["userId"] == "usr_2"
    assert select_account([a, b], "ses_missing") is None
    assert select_account(None, "ses_a") is None


def test_seal_unseal_roundtrip_with_accounts() -> None:
    accounts = [
        account_entry(_user("usr_1", "a@x.com"), "ses_a"),
        account_entry(_user("usr_2", "b@x.com"), "ses_b"),
    ]
    cookie = seal_session(
        _user("usr_2", "b@x.com"),
        None,
        SECRET,
        session_id="ses_b",
        accounts=accounts,
    )
    payload = unseal_session(cookie, SECRET)
    assert payload is not None
    # Active account fields stay top-level (unchanged routing contract).
    assert payload["userId"] == "usr_2"
    assert payload["sid"] == "ses_b"
    assert len(payload["accounts"]) == 2


def test_seal_default_is_backward_compatible_single_account() -> None:
    # No session_id/accounts → legacy flat snapshot, no sid/accounts keys.
    cookie = seal_session(_user("usr_1", "a@x.com"), "tok", SECRET)
    payload = unseal_session(cookie, SECRET)
    assert payload is not None
    assert payload["userId"] == "usr_1"
    assert payload["accessToken"] == "tok"
    assert "sid" not in payload
    assert "accounts" not in payload


def test_unseal_rejects_tampered_signature() -> None:
    cookie = seal_session(_user("usr_1", "a@x.com"), None, SECRET)
    assert unseal_session(cookie, "wrong-secret") is None


def test_switch_target_promotes_to_active_via_reseal() -> None:
    # Simulates the switch endpoint's re-seal: promote a stored entry to active.
    accounts = [
        account_entry(_user("usr_1", "a@x.com"), "ses_a"),
        account_entry(_user("usr_2", "b@x.com"), "ses_b"),
    ]
    target = select_account(accounts, "ses_a")
    assert target is not None
    cookie = seal_session(
        target,
        None,
        SECRET,
        session_id="ses_a",
        accounts=accounts,
    )
    payload = unseal_session(cookie, SECRET)
    assert payload is not None
    assert payload["userId"] == "usr_1"
    assert payload["sid"] == "ses_a"
    # The full set is preserved so the chooser still lists both accounts.
    assert {a["sid"] for a in payload["accounts"]} == {"ses_a", "ses_b"}
