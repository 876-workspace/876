from core.config import Settings
from main import create_app


def test_openapi_uses_canonical_versioned_server() -> None:
    schema = create_app(Settings(environment="test")).openapi()

    assert schema["info"]["title"] == "876 Billing API"
    assert schema["servers"] == [{"url": "/api/v1"}]
    assert schema["paths"] == {}
    assert set(schema["components"]["securitySchemes"]) == {
        "appApiKey",
        "internalKey",
        "schedulerKey",
        "tenantOAuth",
    }
    oauth_flow = schema["components"]["securitySchemes"]["tenantOAuth"]["flows"]["authorizationCode"]
    assert oauth_flow["authorizationUrl"] == "http://127.0.0.1:4000/api/v1/oauth/authorize"
