from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TokenResponse(BaseModel):
    access_token: str = Field(description="The issued OAuth access token (JWT, RS256).")
    token_type: str = Field(default="Bearer", description="Always 'Bearer'.")
    expires_in: int = Field(description="Seconds until the access token expires.")
    scope: str = Field(description="Space-separated list of granted scopes.")
    id_token: str | None = Field(default=None, description="OIDC ID token, if openid scope was requested.")
    refresh_token: str | None = Field(
        default=None,
        description="Refresh token, if offline_access scope was requested.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "Bearer",
                    "expires_in": 3600,
                    "scope": "openid profile email",
                    "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "refresh_token": None,
                }
            ]
        }
    )


class UserinfoResponse(BaseModel):
    sub: str = Field(description="Subject identifier — the user's ID.")
    email: str | None = Field(default=None, description="User's email address.")
    email_verified: bool | None = Field(default=None, description="Whether the email has been verified.")
    name: str | None = Field(default=None, description="User's full display name.")
    given_name: str | None = Field(default=None, description="User's first name.")
    family_name: str | None = Field(default=None, description="User's last name.")
    picture: str | None = Field(default=None, description="URL of the user's profile picture.")


class RevokeRequest(BaseModel):
    token: str = Field(description="The token to revoke.")


class IntrospectRequest(BaseModel):
    token: str = Field(description="The token to introspect.")


class IntrospectResponse(BaseModel):
    active: bool = Field(description="Whether the token is currently active.")
    scope: str | None = Field(default=None, description="Space-separated list of granted scopes.")
    app_id: str | None = Field(default=None, description="876 app the token was issued to.")
    client_id: str | None = Field(default=None, description="Client the token was issued to.")
    sub: str | None = Field(default=None, description="Subject identifier — the user's ID.")
    token_type: str | None = Field(default=None, description="Type of the token. Always 'Bearer'.")
    exp: int | None = Field(default=None, description="Expiry time (Unix seconds).")
    iat: int | None = Field(default=None, description="Issued-at time (Unix seconds).")


class ConsentDenyRequest(BaseModel):
    response_type: str = Field(description="OAuth response_type, must be 'code'.")
    client_id: str = Field(description="The registered OAuth client ID.")
    redirect_uri: str = Field(description="The redirect URI registered with the client.")
    scope: str = Field(default="openid", description="Space-separated list of requested scopes.")
    state: str | None = Field(
        default=None,
        description="Opaque value used to maintain state between request and callback.",
    )
    nonce: str | None = Field(default=None, description="OIDC nonce.")
    prompt: str | None = Field(default=None, description="OIDC prompt parameter.")
    code_challenge: str | None = Field(default=None, description="PKCE code challenge.")
    code_challenge_method: str | None = Field(default=None, description="PKCE method, must be 'S256'.")


class ConsentApproveRequest(ConsentDenyRequest):
    pass


class ConsentAppDetails(BaseModel):
    id: str
    name: str
    client_id: str = Field(serialization_alias="clientId")
    logo_url: str | None = Field(default=None, serialization_alias="logoUrl")
    homepage_url: str | None = Field(default=None, serialization_alias="homepageUrl")

    model_config = ConfigDict(populate_by_name=True)


class ConsentUserDetails(BaseModel):
    id: str
    email: str
    name: str
    avatar: str | None = None


class ConsentRequestDetails(BaseModel):
    app: ConsentAppDetails
    user: ConsentUserDetails
    scopes: list[str]
    previously_granted_scopes: list[str] = Field(default_factory=list, serialization_alias="previouslyGrantedScopes")

    model_config = ConfigDict(populate_by_name=True)


class ConsentRequestDetailsResponse(BaseModel):
    data: ConsentRequestDetails


class AuthorizeResponse(BaseModel):
    status: Literal["authorized", "consent_required"]
    redirect_to: str | None = Field(default=None, serialization_alias="redirectTo")
    consent_path: str | None = Field(default=None, serialization_alias="consentPath")

    model_config = ConfigDict(populate_by_name=True)


class ConsentApproveDenyResponse(BaseModel):
    data: AuthorizeResponse
