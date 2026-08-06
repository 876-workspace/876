"""Caller authorization for the files domain.

Storage authenticates a *service*, not a person: every `/v1` request carries the
one shared internal key, so the key alone proves "some 876 service is calling",
never "this service may touch this file". Resolving a file by id and returning
it therefore let any key holder read, mint a signed URL for, or delete any
file on the platform — an ID scan or a payment receipt belonging to a different
app, organization, or user.

The disclosure model in `.claude/rules/storage-architecture.md` says the owning
app must *assert an authorized actor*, because Storage cannot know another
app's domain rules — it has no way to decide whether a given user is a
participant in a given conversation. This module is where that assertion is
required and checked.

The assertion travels in headers rather than the body so one mechanism covers
`GET`, `POST` and `DELETE` alike, matching the `x-876-actor-user-id` convention
already used by `apps/widgets-api`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Header, status

from core.errors import AppHTTPException

SOURCE_APP_HEADER = "x-876-source-app-id"
ACTOR_USER_HEADER = "x-876-actor-user-id"
ACTOR_ORG_HEADER = "x-876-actor-org-id"


@dataclass(frozen=True)
class CallerAssertion:
    """What the calling app asserts about the principal on whose behalf it acts."""

    source_app_id: str | None
    actor_user_id: str | None
    actor_org_id: str | None


async def resolve_caller(
    source_app_id: Annotated[str | None, Header(alias=SOURCE_APP_HEADER)] = None,
    actor_user_id: Annotated[str | None, Header(alias=ACTOR_USER_HEADER)] = None,
    actor_org_id: Annotated[str | None, Header(alias=ACTOR_ORG_HEADER)] = None,
) -> CallerAssertion:
    return CallerAssertion(
        source_app_id=(source_app_id or None),
        actor_user_id=(actor_user_id or None),
        actor_org_id=(actor_org_id or None),
    )


CallerDep = Annotated[CallerAssertion, Depends(resolve_caller)]


def _forbidden() -> AppHTTPException:
    """One opaque error for every denial.

    Distinguishing "not authorized for this file" from "no such file" would turn
    the endpoint into an oracle for which file ids exist.
    """
    return AppHTTPException(
        code="storage/file-not-found",
        message="The file was not found.",
        http_status_code=status.HTTP_404_NOT_FOUND,
    )


def _is_owner(file_row: Any, caller: CallerAssertion) -> bool:
    """Whether the caller is acting *as* the entity the file belongs to.

    A platform-owned file (an app logo, say) has no user or organization behind
    it, so the app that created it is what stands in for the owner.
    """
    if file_row.owner_type == "user":
        return caller.actor_user_id is not None and caller.actor_user_id == file_row.owner_id
    if file_row.owner_type == "organization":
        return caller.actor_org_id is not None and caller.actor_org_id == file_row.owner_id
    if file_row.owner_type == "platform":
        return caller.source_app_id is not None and caller.source_app_id == file_row.source_app_id
    return False


def _is_owning_app_with_actor(file_row: Any, caller: CallerAssertion) -> bool:
    """The `audience: app` rule: the creating app, naming who it acts for."""
    return caller.source_app_id == file_row.source_app_id and caller.actor_user_id is not None


def _shares_quota_org(file_row: Any, caller: CallerAssertion) -> bool:
    """A user-owned file drawn against an organization's pool is that org's business too."""
    quota_org_id = getattr(file_row, "quota_org_id", None)
    return caller.actor_org_id is not None and quota_org_id is not None and caller.actor_org_id == quota_org_id


def authorize_file_read(file_row: Any, caller: CallerAssertion) -> None:
    """Authorize reading a file's metadata or minting a read URL for its bytes.

    Default deny: every audience states its own rule, so a new audience value
    added later is refused until someone decides what it means.
    """
    if file_row.audience == "public":
        return

    # Nothing below is decidable without knowing which app is asking.
    if caller.source_app_id is None:
        raise _forbidden()

    if file_row.audience == "private":
        # The owner alone — whichever kind of entity that owner is.
        if _is_owner(file_row, caller):
            return
        raise _forbidden()

    if file_row.audience == "organization":
        if _is_owner(file_row, caller) or _shares_quota_org(file_row, caller):
            return
        raise _forbidden()

    if file_row.audience == "app":
        # Delegated: only the app that created the file may arbitrate access to
        # it, and it must name the actor it is acting for. Storage cannot know
        # that app's domain rules — whether this user is in that conversation.
        if _is_owning_app_with_actor(file_row, caller):
            return
        raise _forbidden()

    raise _forbidden()


def authorize_file_delete(file_row: Any, caller: CallerAssertion) -> None:
    """Authorize destroying a file.

    Unlike reading, this does not open up for `public`: a logo being
    world-*readable* is not a licence for another app to remove an
    organization's branding. Destroying always requires acting as the owner.
    """
    if caller.source_app_id is None:
        raise _forbidden()
    if _is_owner(file_row, caller):
        return
    if file_row.audience == "app" and _is_owning_app_with_actor(file_row, caller):
        return
    raise _forbidden()
