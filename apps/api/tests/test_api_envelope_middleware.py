from core.middleware import _envelope_payload


def test_wraps_success_data_in_canonical_envelope() -> None:
    resource = {"object": "example", "id": "example_123"}

    assert _envelope_payload(resource, 200) == {
        "data": resource,
        "error": None,
    }


def test_preserves_client_safe_error_details() -> None:
    assert _envelope_payload(
        {
            "error": {
                "code": "validation/invalid-request",
                "message": "The request is invalid.",
                "details": [{"field": "email"}],
            }
        },
        422,
    ) == {
        "data": None,
        "error": {
            "code": "validation/invalid-request",
            "message": "The request is invalid.",
            "details": [{"field": "email"}],
        },
    }


def test_removes_http_status_metadata_from_existing_envelope() -> None:
    assert _envelope_payload(
        {
            "data": None,
            "error": {
                "code": "auth/forbidden",
                "message": "Forbidden.",
                "httpStatus": 403,
                "status": 403,
            },
        },
        403,
    ) == {
        "data": None,
        "error": {
            "code": "auth/forbidden",
            "message": "Forbidden.",
        },
    }


def test_normalizes_string_error_in_existing_envelope() -> None:
    assert _envelope_payload(
        {"data": None, "error": "auth/invalid-credentials"},
        401,
    ) == {
        "data": None,
        "error": {
            "code": "auth/invalid-credentials",
            "message": "auth/invalid-credentials",
        },
    }
