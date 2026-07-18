from typing import Annotated, cast

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import App, FinanceProvisioningOutbox, ProvisioningManifestRevision, ProvisioningNote, ProvisioningRun
from db.repositories.provisioning import ProvisioningRepository
from db.repositories.provisioning_runs import ProvisioningRunRepository
from db.session import get_db
from domains.provisioning.schemas import (
    ProvisioningApplicationClaimRequest,
    ProvisioningApplicationCompleteRequest,
    ProvisioningCatalogResponse,
    ProvisioningDraftReplace,
    ProvisioningManifestResponse,
    ProvisioningNoteCreate,
    ProvisioningNoteDeleteResponse,
    ProvisioningNoteResponse,
    ProvisioningPropertyInput,
    ProvisioningPropertyResponse,
    ProvisioningReconcileRequest,
    ProvisioningReconcileResponse,
    ProvisioningResourceInput,
    ProvisioningResourceResponse,
    ProvisioningRevisionResponse,
    ProvisioningRunResponse,
    ProvisioningRunStatus,
    ProvisioningRunStepResponse,
    ProvisioningRunTrigger,
    ProvisioningStepInput,
    ProvisioningStepResponse,
    ProvisioningTargetType,
    ProvisioningValidationResponse,
)
from services.finance_provisioning import reconcile_finance_connections
from services.provisioning_catalog import catalog_definitions, validate_draft

from . import docs

router = APIRouter(prefix="/provisioning", tags=["Provisioning"])
logger = get_logger(__name__)


def _serialize_revision(row: ProvisioningManifestRevision) -> ProvisioningRevisionResponse:
    return ProvisioningRevisionResponse(
        id=row.id,
        manifest_id=row.manifest_id,
        revision=row.revision,
        status=row.status,
        reconciliation=row.reconciliation,
        preserve_tenant_overrides=row.preserve_tenant_overrides,
        finance_dependency=row.finance_dependency,
        finance_scopes=row.finance_scopes,
        resources=[
            ProvisioningResourceResponse(
                id=resource.id,
                resource_type=resource.resource_type,
                key=resource.key,
                position=resource.position,
                properties=[
                    ProvisioningPropertyResponse(
                        id=property_.id,
                        key=property_.key,
                        value_type=property_.value_type,
                        string_value=property_.string_value,
                        integer_value=str(property_.integer_value) if property_.integer_value is not None else None,
                        decimal_value=property_.decimal_value,
                        boolean_value=property_.boolean_value,
                        reference_namespace=property_.reference_namespace,
                        reference_key=property_.reference_key,
                    )
                    for property_ in sorted(resource.properties, key=lambda item: item.key)
                ],
            )
            for resource in sorted(row.resources, key=lambda item: (item.position, item.id))
        ],
        steps=[
            ProvisioningStepResponse(
                id=step.id,
                key=step.key,
                description=step.description,
                position=step.position,
            )
            for step in sorted(row.steps, key=lambda item: (item.position, item.id))
        ],
        published_at=row.published_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _revision_as_draft(row: ProvisioningManifestRevision) -> ProvisioningDraftReplace:
    return ProvisioningDraftReplace(
        finance_dependency=row.finance_dependency,
        finance_scopes=row.finance_scopes,
        resources=[
            ProvisioningResourceInput(
                resource_type=resource.resource_type,
                key=resource.key,
                position=resource.position,
                properties=[
                    ProvisioningPropertyInput(
                        key=property_.key,
                        value_type=property_.value_type,
                        string_value=property_.string_value,
                        integer_value=property_.integer_value,
                        decimal_value=property_.decimal_value,
                        boolean_value=property_.boolean_value,
                        reference_namespace=property_.reference_namespace,
                        reference_key=property_.reference_key,
                    )
                    for property_ in resource.properties
                ],
            )
            for resource in row.resources
        ],
        steps=[
            ProvisioningStepInput(key=step.key, description=step.description, position=step.position)
            for step in row.steps
        ],
    )


def _serialize_note(row: ProvisioningNote) -> ProvisioningNoteResponse:
    return ProvisioningNoteResponse(
        id=row.id,
        manifest_id=row.manifest_id,
        body=row.body,
        author_user_id=row.author_user_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_run(row: ProvisioningRun) -> ProvisioningRunResponse:
    return ProvisioningRunResponse(
        id=row.id,
        organization_id=row.organization_id,
        app_id=row.app_id,
        subscription_id=row.subscription_id,
        outbox_event_id=row.outbox_event_id,
        trigger=cast(ProvisioningRunTrigger, row.trigger),
        status=cast(ProvisioningRunStatus, row.status),
        finance_revision_id=row.finance_revision_id,
        finance_revision=row.finance_revision,
        application_revision_id=row.application_revision_id,
        application_revision=row.application_revision,
        attempt_count=row.attempt_count,
        available_at=row.available_at,
        started_at=row.started_at,
        completed_at=row.completed_at,
        last_error=row.last_error,
        steps=[
            ProvisioningRunStepResponse(
                id=step.id,
                target_type=cast(ProvisioningTargetType, step.target_type),
                target_key=step.target_key,
                revision_id=step.revision_id,
                revision=step.revision,
                step_key=step.step_key,
                description=step.description,
                position=step.position,
                status=cast(ProvisioningRunStatus, step.status),
                attempt_count=step.attempt_count,
                started_at=step.started_at,
                completed_at=step.completed_at,
                last_error=step.last_error,
            )
            for step in row.steps
        ],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _require_valid_target(
    db: AsyncSession,
    target_type: ProvisioningTargetType,
    target_key: str,
) -> str:
    if target_type != "application":
        return target_key
    app = await _resolve_application_target(db, target_key)
    if app is None:
        raise AppHTTPException(
            code="provisioning/target-not-found",
            message="Provisioning target was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return app.slug


async def _resolve_application_target(db: AsyncSession, target_key: str) -> App | None:
    """Resolve an application by its stable ID or public slug."""
    return cast(
        App | None,
        await db.scalar(select(App).where(or_(App.id == target_key, App.slug == target_key)).limit(1)),
    )


async def _storage_target_key(
    db: AsyncSession,
    target_type: ProvisioningTargetType,
    target_key: str,
) -> str:
    if target_type != "application":
        return target_key
    app = await _resolve_application_target(db, target_key)
    if app is None:
        raise AppHTTPException(
            code="provisioning/target-not-found",
            message="Provisioning target was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return app.id


@router.get(
    "/catalog/{target_type}/{target_key}",
    response_model=ProvisioningCatalogResponse,
    summary=docs.RETRIEVE_CATALOG_SUMMARY,
    description=docs.RETRIEVE_CATALOG_DESCRIPTION,
)
async def retrieve_catalog(
    target_type: ProvisioningTargetType,
    target_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningCatalogResponse:
    catalog_key = await _require_valid_target(db, target_type, target_key)
    return ProvisioningCatalogResponse(
        target_type=target_type,
        resource_types=catalog_definitions(target_type, catalog_key),
    )


@router.get(
    "/manifests/{target_type}/{target_key}",
    response_model=ProvisioningManifestResponse,
    summary=docs.RETRIEVE_MANIFEST_SUMMARY,
    description=docs.RETRIEVE_MANIFEST_DESCRIPTION,
)
async def retrieve_manifest(
    target_type: ProvisioningTargetType,
    target_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningManifestResponse:
    storage_key = await _storage_target_key(db, target_type, target_key)
    repository = ProvisioningRepository(db)
    manifest = await repository.retrieve_manifest(target_type, storage_key)
    if manifest is None:
        raise AppHTTPException(
            code="provisioning/manifest-not-found",
            message="Provisioning manifest was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    published = await repository.retrieve_revision(target_type, storage_key, "published")
    draft = await repository.retrieve_revision(target_type, storage_key, "draft")
    return ProvisioningManifestResponse(
        id=manifest.id,
        target_type=target_type,
        target_key=storage_key,
        published=_serialize_revision(published) if published else None,
        draft=_serialize_revision(draft) if draft else None,
        created_at=manifest.created_at,
        updated_at=manifest.updated_at,
    )


@router.get(
    "/manifests/{target_type}/{target_key}/published",
    response_model=ProvisioningRevisionResponse,
    summary=docs.RETRIEVE_PUBLISHED_SUMMARY,
    description=docs.RETRIEVE_PUBLISHED_DESCRIPTION,
)
async def retrieve_published_revision(
    target_type: ProvisioningTargetType,
    target_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningRevisionResponse:
    storage_key = await _storage_target_key(db, target_type, target_key)
    revision = await ProvisioningRepository(db).retrieve_revision(target_type, storage_key, "published")
    if revision is None:
        raise AppHTTPException(
            code="provisioning/published-revision-not-found",
            message="Published provisioning revision was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_revision(revision)


@router.put(
    "/manifests/{target_type}/{target_key}/draft",
    response_model=ProvisioningRevisionResponse,
    summary=docs.REPLACE_DRAFT_SUMMARY,
    description=docs.REPLACE_DRAFT_DESCRIPTION,
)
async def replace_draft(
    target_type: ProvisioningTargetType,
    target_key: str,
    body: ProvisioningDraftReplace,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningRevisionResponse:
    catalog_key = await _require_valid_target(db, target_type, target_key)
    storage_key = await _storage_target_key(db, target_type, target_key)
    issues = validate_draft(target_type, catalog_key, body)
    if issues:
        raise AppHTTPException(
            code="provisioning/invalid-draft",
            message=(
                "Provisioning draft does not match the registered resource schemas: "
                f"{issues[0].path}: {issues[0].message}"
            ),
            http_status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    now = now_unix_seconds()
    revision = await ProvisioningRepository(db).replace_draft(
        target_type,
        storage_key,
        reconciliation=body.reconciliation,
        preserve_tenant_overrides=body.preserve_tenant_overrides,
        finance_dependency=body.finance_dependency,
        finance_scopes=body.finance_scopes,
        resources=body.resources,
        steps=body.steps,
        now=now,
    )
    logger.info(
        "provisioning.draft.replaced",
        target_type=target_type,
        target_key=target_key,
        revision=revision.revision,
    )
    return _serialize_revision(revision)


@router.post(
    "/manifests/{target_type}/{target_key}/validate",
    response_model=ProvisioningValidationResponse,
    summary=docs.VALIDATE_DRAFT_SUMMARY,
    description=docs.VALIDATE_DRAFT_DESCRIPTION,
)
async def validate_manifest_draft(
    target_type: ProvisioningTargetType,
    target_key: str,
    body: ProvisioningDraftReplace,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningValidationResponse:
    catalog_key = await _require_valid_target(db, target_type, target_key)
    issues = validate_draft(target_type, catalog_key, body)
    return ProvisioningValidationResponse(valid=not issues, issues=issues)


@router.post(
    "/manifests/{target_type}/{target_key}/publish",
    response_model=ProvisioningRevisionResponse,
    summary=docs.PUBLISH_DRAFT_SUMMARY,
    description=docs.PUBLISH_DRAFT_DESCRIPTION,
)
async def publish_draft(
    target_type: ProvisioningTargetType,
    target_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningRevisionResponse:
    repository = ProvisioningRepository(db)
    storage_key = await _storage_target_key(db, target_type, target_key)
    locked = await repository.retrieve_draft_for_update(target_type, storage_key)
    if locked is None:
        raise AppHTTPException(
            code="provisioning/draft-not-found",
            message="Provisioning draft was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    manifest, draft = locked
    catalog_key = await _require_valid_target(db, target_type, target_key)
    issues = validate_draft(target_type, catalog_key, _revision_as_draft(draft))
    if issues:
        raise AppHTTPException(
            code="provisioning/invalid-draft",
            message=(
                "Provisioning draft does not match the registered resource schemas: "
                f"{issues[0].path}: {issues[0].message}"
            ),
            http_status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    published = await repository.promote_draft(manifest, draft, now=now_unix_seconds())
    if target_type == "application":
        await reconcile_finance_connections(
            db,
            app_id=storage_key,
            limit=None,
            trigger="manifest_publish",
        )
    logger.info(
        "provisioning.draft.published",
        target_type=target_type,
        target_key=target_key,
        revision=published.revision,
    )
    return _serialize_revision(published)


@router.get(
    "/runs",
    response_model=ListObject[ProvisioningRunResponse],
    summary="List provisioning runs",
)
async def list_runs(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    organization_id: str | None = None,
    app_id: str | None = None,
    run_status: Annotated[ProvisioningRunStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[ProvisioningRunResponse]:
    if starting_after and ending_before:
        raise AppHTTPException(
            code="provisioning/invalid-cursor",
            message="Use either starting_after or ending_before, not both.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    storage_app_id = None
    if app_id:
        app = await _resolve_application_target(db, app_id)
        if app is None:
            raise AppHTTPException(
                code="provisioning/target-not-found",
                message="Provisioning target was not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        storage_app_id = app.id
    rows, has_more = await ProvisioningRunRepository(db).list(
        organization_id=organization_id,
        app_id=storage_app_id,
        status=run_status,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
    )
    return ListObject[ProvisioningRunResponse](
        data=[_serialize_run(row) for row in rows],
        has_more=has_more,
        url="/provisioning/runs",
    )


@router.post(
    "/runs/application/claim",
    response_model=ProvisioningRunResponse,
    summary="Claim an application-owned provisioning run",
)
async def claim_application_run(
    body: ProvisioningApplicationClaimRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningRunResponse:
    app = await _resolve_application_target(db, body.app_id)
    if app is None:
        raise AppHTTPException(
            code="provisioning/target-not-found",
            message="Provisioning target was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    run = await ProvisioningRunRepository(db).claim_application(
        organization_id=body.organization_id,
        app_id=app.id,
        now=now_unix_seconds(),
    )
    if run is None:
        raise AppHTTPException(
            code="provisioning/run-not-claimable",
            message="No queued application provisioning run was found.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    return _serialize_run(run)


@router.post(
    "/runs/reconcile",
    response_model=ProvisioningReconcileResponse,
    summary="Reconcile provisioning runs",
)
async def reconcile_runs(
    body: ProvisioningReconcileRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningReconcileResponse:
    app_id = body.app_id
    if app_id:
        app = await _resolve_application_target(db, app_id)
        if app is None:
            raise AppHTTPException(
                code="provisioning/target-not-found",
                message="Provisioning target was not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        app_id = app.id
    examined, enqueued, next_cursor = await reconcile_finance_connections(
        db,
        app_id=app_id,
        organization_id=body.organization_id,
        limit=body.limit,
        starting_after=body.starting_after,
        trigger="manual_reconcile",
    )
    return ProvisioningReconcileResponse(
        examined=examined,
        enqueued=enqueued,
        next_cursor=next_cursor,
    )


@router.get(
    "/runs/{run_id}",
    response_model=ProvisioningRunResponse,
    summary="Retrieve a provisioning run",
)
async def retrieve_run(
    run_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningRunResponse:
    run = await ProvisioningRunRepository(db).retrieve(run_id)
    if run is None:
        raise AppHTTPException(
            code="provisioning/run-not-found",
            message="Provisioning run was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_run(run)


@router.post(
    "/runs/{run_id}/retry",
    response_model=ProvisioningRunResponse,
    summary="Retry a failed provisioning run",
)
async def retry_run(
    run_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningRunResponse:
    repository = ProvisioningRunRepository(db)
    run = await repository.retrieve(run_id, for_update=True)
    if run is None:
        raise AppHTTPException(
            code="provisioning/run-not-found",
            message="Provisioning run was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if run.status != "failed":
        raise AppHTTPException(
            code="provisioning/run-not-retryable",
            message="Only failed provisioning runs can be retried.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    now = now_unix_seconds()
    if run.outbox_event_id:
        event = await db.get(FinanceProvisioningOutbox, run.outbox_event_id, with_for_update=True)
        if event is None:
            raise AppHTTPException(
                code="provisioning/run-event-not-found",
                message="The provisioning run's delivery event was not found.",
                http_status_code=status.HTTP_409_CONFLICT,
            )
        event.status = "pending"
        event.available_at = now
        event.locked_at = None
        event.last_error = None
        event.updated_at = now
    repository.queue_retry(run, now=now)
    await db.flush()
    return _serialize_run(run)


@router.post(
    "/runs/{run_id}/complete",
    response_model=ProvisioningRunResponse,
    summary="Complete an application-owned provisioning run",
)
async def complete_application_run(
    run_id: str,
    body: ProvisioningApplicationCompleteRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningRunResponse:
    repository = ProvisioningRunRepository(db)
    run = await repository.retrieve(run_id, for_update=True)
    if run is None:
        raise AppHTTPException(
            code="provisioning/run-not-found",
            message="Provisioning run was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if run.outbox_event_id or run.status != "processing":
        raise AppHTTPException(
            code="provisioning/run-not-completable",
            message="Only processing application-owned runs can be completed.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    now = now_unix_seconds()
    if body.status == "succeeded":
        repository.mark_succeeded(run, now=now)
    else:
        repository.mark_failed(
            run,
            now=now,
            available_at=now,
            message=(body.error or "Application provisioning failed.").strip(),
        )
    await db.flush()
    return _serialize_run(run)


@router.get(
    "/manifests/{target_type}/{target_key}/notes",
    response_model=ListObject[ProvisioningNoteResponse],
    summary="List provisioning notes",
)
async def list_notes(
    target_type: ProvisioningTargetType,
    target_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[ProvisioningNoteResponse]:
    repository = ProvisioningRepository(db)
    storage_key = await _storage_target_key(db, target_type, target_key)
    manifest = await repository.retrieve_manifest(target_type, storage_key)
    if manifest is None:
        raise AppHTTPException(
            code="provisioning/manifest-not-found",
            message="Provisioning manifest was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    rows, has_more = await repository.list_notes(
        manifest.id,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
    )
    return ListObject[ProvisioningNoteResponse](
        data=[_serialize_note(row) for row in rows],
        has_more=has_more,
        url=f"/provisioning/manifests/{target_type}/{target_key}/notes",
    )


@router.post(
    "/manifests/{target_type}/{target_key}/notes",
    response_model=ProvisioningNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a provisioning note",
)
async def create_note(
    target_type: ProvisioningTargetType,
    target_key: str,
    body: ProvisioningNoteCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningNoteResponse:
    repository = ProvisioningRepository(db)
    storage_key = await _storage_target_key(db, target_type, target_key)
    manifest = await repository.retrieve_manifest(target_type, storage_key)
    if manifest is None:
        raise AppHTTPException(
            code="provisioning/manifest-not-found",
            message="Provisioning manifest was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    now = now_unix_seconds()
    note = await repository.create_note(
        note_id=generate_id("provisioningNote"),
        manifest_id=manifest.id,
        body=body.body,
        author_user_id=body.author_user_id,
        now=now,
    )
    return _serialize_note(note)


@router.delete(
    "/manifests/{target_type}/{target_key}/notes/{note_id}",
    response_model=ProvisioningNoteDeleteResponse,
    summary="Delete a provisioning note",
)
async def delete_note(
    target_type: ProvisioningTargetType,
    target_key: str,
    note_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ProvisioningNoteDeleteResponse:
    repository = ProvisioningRepository(db)
    storage_key = await _storage_target_key(db, target_type, target_key)
    manifest = await repository.retrieve_manifest(target_type, storage_key)
    if manifest is None or not await repository.delete_note(manifest.id, note_id):
        raise AppHTTPException(
            code="provisioning/note-not-found",
            message="Provisioning note was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return ProvisioningNoteDeleteResponse(id=note_id)
