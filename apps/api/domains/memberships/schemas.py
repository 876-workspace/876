from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# Organization-membership role NAME. Historically a closed
# owner/admin/member literal; now an open string because orgs define custom
# roles (see `organization_roles`). Endpoints resolve the name against the
# org's role catalog — default system roles are owner, admin,
# billing_manager, and member. Kept in sync with the TS
# `membershipRoleSchema` in packages/core/src/types/memberships.ts.
OrgRole = Annotated[str, StringConstraints(min_length=1, max_length=64)]


class MembershipResponse(BaseModel):
    object: Literal["membership"] = Field(
        default="membership",
        description="String representing the object's type. Always 'membership'.",
    )
    id: str = Field(description="Unique identifier for the membership.")
    organization_id: str = Field(description="Unique identifier for the organization.")
    user_id: str = Field(description="Unique identifier for the user.")
    workos_membership_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching WorkOS membership.",
    )
    role: str = Field(
        description="The member's role name within the organization.",
        examples=["owner", "admin", "billing_manager", "member"],
    )
    role_id: str | None = Field(
        default=None,
        description="ID of the organization role this membership is linked to.",
    )
    status: str = Field(
        description="The membership status.",
        examples=["active", "invited", "suspended", "removed"],
    )
    created_at: int = Field(
        description="Time at which the membership was created. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the membership was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "object": "membership",
                    "id": "mbr_01HFNPGM9K",
                    "organization_id": "org_01HFNPGM9K",
                    "user_id": "usr_01HFNPGM9K",
                    "workos_membership_id": None,
                    "role": "member",
                    "status": "active",
                    "created_at": 1700000000,
                    "updated_at": 1700000000,
                }
            ]
        },
    )


class MembershipCreate(BaseModel):
    user_id: str = Field(description="Unique identifier for the user.")
    organization_id: str = Field(description="Unique identifier for the organization.")
    role: OrgRole | None = Field(
        default=None,
        description="The member's role. Defaults to 'member'.",
    )
    status: str | None = Field(
        default=None,
        description="Initial membership status. Defaults to 'active'.",
    )


class MembershipCreateRequest(BaseModel):
    user_id: str = Field(description="Unique identifier for the user.", alias="userId")
    role: OrgRole | None = Field(
        default=None,
        description="The member's role. Defaults to 'member'.",
    )
    status: str | None = Field(
        default=None,
        description="Initial membership status. Defaults to 'active'.",
    )

    model_config = ConfigDict(populate_by_name=True)


class MembershipUpdate(BaseModel):
    workos_membership_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching WorkOS membership. Set to null to clear it.",
        alias="workosMembershipId",
    )
    role: OrgRole | None = Field(default=None, description="The member's role within the organization.")
    status: str | None = Field(default=None, description="The membership status.")

    model_config = ConfigDict(populate_by_name=True)


class MembershipDeleteResponse(BaseModel):
    object: Literal["membership"] = "membership"
    id: str
    deleted: bool = True
