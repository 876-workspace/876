from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from db.models import InvoicePreference
from domains.billing.workflows.late_fees import assess_late_fees


async def test_disabled_late_fee_policy_is_a_safe_noop() -> None:
    preference = InvoicePreference(tenant_id="btenant_123", late_fees_enabled=False)
    session = MagicMock()
    session.scalar = AsyncMock(return_value=preference)

    result = await assess_late_fees(session, preference.tenant_id, as_of=1_700_000_000)

    assert result["object"] == "late_fee_run"
    assert result["created"] == 0
    assert result["hasMore"] is False
    session.execute.assert_not_called()
