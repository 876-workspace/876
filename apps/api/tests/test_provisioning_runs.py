from db.models import ProvisioningRun, ProvisioningRunStep
from db.repositories.provisioning_runs import ProvisioningRunRepository


def _run() -> ProvisioningRun:
    run = ProvisioningRun(
        id="prn_test",
        organization_id="org_test",
        app_id="rap_test",
        subscription_id="sub_test",
        outbox_event_id="fpe_test",
        trigger="app_activation",
        status="queued",
        manifest_version=1,
        finance_revision_id="pmr_finance",
        finance_revision=2,
        application_revision_id="pmr_app",
        application_revision=3,
        attempt_count=0,
        available_at=100,
        started_at=None,
        completed_at=None,
        last_error=None,
        created_at=100,
        updated_at=100,
    )
    run.steps = [
        ProvisioningRunStep(
            id="prst_test",
            run_id=run.id,
            target_type="finance",
            target_key="shared",
            revision_id="pmr_finance",
            revision=2,
            step_key="apply_defaults",
            description="Apply defaults.",
            position=0,
            status="queued",
            attempt_count=0,
            started_at=None,
            completed_at=None,
            last_error=None,
            created_at=100,
            updated_at=100,
        )
    ]
    return run


def test_run_lifecycle_preserves_attempt_history_across_retry() -> None:
    run = _run()

    ProvisioningRunRepository.mark_processing(run, now=110)
    assert (run.status, run.attempt_count, run.steps[0].attempt_count) == ("processing", 1, 1)

    ProvisioningRunRepository.mark_failed(run, now=120, available_at=130, message="temporary")
    assert run.status == "failed"
    assert run.steps[0].status == "failed"
    assert run.last_error == "temporary"

    ProvisioningRunRepository.queue_retry(run, now=125)
    assert run.status == "queued"
    assert run.trigger == "app_activation"
    assert run.attempt_count == 1
    assert run.steps[0].attempt_count == 1

    ProvisioningRunRepository.mark_processing(run, now=126)
    ProvisioningRunRepository.mark_succeeded(run, now=140)
    assert (run.status, run.attempt_count, run.completed_at) == ("succeeded", 2, 140)
    assert (run.steps[0].status, run.steps[0].attempt_count) == ("succeeded", 2)
