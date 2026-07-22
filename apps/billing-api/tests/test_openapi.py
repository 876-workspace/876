from core.config import Settings
from domains.billing.generated_routes import ROUTES
from main import create_app


def test_openapi_uses_canonical_versioned_server() -> None:
    schema = create_app(Settings(environment="test")).openapi()

    assert schema["info"]["title"] == "876 Billing API"
    assert schema["servers"] == [{"url": "/api/v1"}]
    assert len(schema["paths"]) == 109
    documented_operations = sum(
        method.lower() in {"delete", "get", "patch", "post", "put"}
        for path in schema["paths"].values()
        for method in path
    )
    assert documented_operations == len(ROUTES) == 187
    assert set(schema["components"]["securitySchemes"]) == {
        "appApiKey",
        "internalKey",
        "schedulerKey",
        "tenantOAuth",
    }
    oauth_flow = schema["components"]["securitySchemes"]["tenantOAuth"]["flows"]["authorizationCode"]
    assert oauth_flow["authorizationUrl"] == "http://127.0.0.1:4000/api/v1/oauth/authorize"
