from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from core.errors import AppHTTPException
from db.models import Customer, Invoice, InvoiceLine, Tenant
from domains.billing.resources import ResourceDefinition
from domains.billing.workflows.documents import create_document


async def test_create_invoice_snapshots_lines_and_calculates_totals() -> None:
    session = MagicMock()
    session.scalar = AsyncMock(
        side_effect=[
            Customer(
                id="cust_123",
                tenant_id="btenant_123",
                name="Island Supply",
                email="accounts@example.com",
                billing_address={"country": "JM"},
                default_currency="JMD",
            ),
            Tenant(id="btenant_123", default_currency="JMD"),
            "JMD",
        ]
    )
    session.flush = AsyncMock()
    invoice = Invoice(id="inv_123", tenant_id="btenant_123")
    service = MagicMock()
    service.session = session
    service.create = AsyncMock(return_value=invoice)
    definition = ResourceDefinition(Invoice, "invoice", "inv")

    result = await create_document(
        service,
        definition,
        "btenant_123",
        {
            "customerId": "cust_123",
            "discountAmount": "100",
            "shippingAmount": "50",
            "lines": [
                {
                    "description": "Consulting",
                    "quantity": 2,
                    "unitAmount": "1000",
                    "taxAmount": "150",
                    "discountAmount": "200",
                }
            ],
        },
    )

    assert result is invoice
    values = service.create.await_args.args[2]
    assert values["subtotalAmount"] == 2000
    assert values["taxAmount"] == 150
    assert values["discountAmount"] == 100
    assert values["totalAmount"] == 1900
    assert values["amountDue"] == 1900
    line = session.add.call_args.args[0]
    assert isinstance(line, InvoiceLine)
    assert line.total_amount == 1950
    assert line.description == "Consulting"


async def test_create_invoice_rejects_line_discount_above_subtotal() -> None:
    session = MagicMock()
    session.scalar = AsyncMock(
        side_effect=[
            Customer(id="cust_123", tenant_id="btenant_123", name="Island Supply", default_currency="JMD"),
            Tenant(id="btenant_123", default_currency="JMD"),
            "JMD",
        ]
    )
    service = MagicMock()
    service.session = session
    service.create = AsyncMock()

    with pytest.raises(AppHTTPException) as invalid:
        await create_document(
            service,
            ResourceDefinition(Invoice, "invoice", "inv"),
            "btenant_123",
            {
                "customerId": "cust_123",
                "lines": [{"description": "Consulting", "unitAmount": 100, "discountAmount": 101}],
            },
        )

    assert invalid.value.status_code == 422
    assert invalid.value.app_code == "validation/invalid-request"
    service.create.assert_not_awaited()
