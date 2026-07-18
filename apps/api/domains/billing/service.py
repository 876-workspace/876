import asyncio
from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any, cast

import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.models.billing_accounts import BillingAccount
from db.models.billing_provider_objects import BillingProviderObject


class BillingProvider(ABC):
    """
    Abstract interface for billing providers (Stripe, Paddle, LemonSqueezy, Internal).
    """

    @abstractmethod
    async def create_customer(
        self, session: AsyncSession, account: BillingAccount
    ) -> BillingProviderObject:
        """Create a customer/account in the external provider."""
        pass

    @abstractmethod
    async def create_checkout_session(
        self, session: AsyncSession, account: BillingAccount, price_id: str, success_url: str, cancel_url: str
    ) -> str:
        """Return a URL for a checkout session."""
        pass

    @abstractmethod
    async def create_subscription(
        self, session: AsyncSession, account: BillingAccount, price_id: str
    ) -> dict[str, Any]:
        """Create a subscription directly if payment method is on file."""
        pass

    @abstractmethod
    async def update_subscription(
        self, session: AsyncSession, subscription_id: str, price_id: str
    ) -> dict[str, Any]:
        """Update an existing subscription."""
        pass

    @abstractmethod
    async def cancel_subscription(
        self, session: AsyncSession, subscription_id: str, cancel_at_period_end: bool = True
    ) -> dict[str, Any]:
        """Cancel an existing subscription."""
        pass

    @abstractmethod
    async def create_customer_portal_session(
        self, session: AsyncSession, account: BillingAccount, return_url: str
    ) -> str:
        """Return a URL for the customer portal to manage payment methods."""
        pass

    @abstractmethod
    async def handle_webhook(self, payload: bytes, signature: str) -> None:
        """Process incoming webhook event from the provider."""
        pass

class StripeBillingProvider(BillingProvider):
    """
    Stripe implementation of the BillingProvider interface.
    """

    def __init__(self) -> None:
        stripe.api_key = get_settings().stripe_secret_key

    async def create_customer(
        self, session: AsyncSession, account: BillingAccount
    ) -> BillingProviderObject:
        params: dict[str, Any] = {
            "metadata": {
                "billing_account_id": account.id,
                "organization_id": account.organization_id,
            },
        }
        if account.email:
            params["email"] = account.email
        if account.name:
            params["name"] = account.name

        customer = await asyncio.to_thread(stripe.Customer.create, **params)
        now = now_unix_seconds()

        return BillingProviderObject(
            id=generate_id("billingProviderObject"),
            provider="stripe",
            provider_object_type="customer",
            provider_object_id=customer.id,
            internal_object_type="billing_account",
            internal_object_id=account.id,
            livemode=customer.livemode,
            raw_payload=customer.to_dict(),
            created_at=now,
            updated_at=now,
        )

    async def create_checkout_session(
        self, session: AsyncSession, account: BillingAccount, price_id: str, success_url: str, cancel_url: str
    ) -> str:
        # Note: In a real system, you would look up the stripe_customer_id from billing_provider_objects
        # This is a stub for the checkout session creation
        checkout_session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
        )
        if not checkout_session.url:
            raise RuntimeError("Stripe did not return a checkout session URL.")

        return checkout_session.url

    async def create_subscription(
        self, session: AsyncSession, account: BillingAccount, price_id: str
    ) -> dict[str, Any]:
        # Placeholder for creating subscription directly
        return {}

    async def update_subscription(
        self, session: AsyncSession, subscription_id: str, price_id: str
    ) -> dict[str, Any]:
        # Placeholder
        return {}

    async def cancel_subscription(
        self, session: AsyncSession, subscription_id: str, cancel_at_period_end: bool = True
    ) -> dict[str, Any]:
        if cancel_at_period_end:
            sub = await asyncio.to_thread(
                stripe.Subscription.modify,
                subscription_id,
                cancel_at_period_end=True,
            )
        else:
            stripe_subscription = await asyncio.to_thread(
                stripe.Subscription.retrieve,
                subscription_id,
            )
            sub = await asyncio.to_thread(stripe_subscription.cancel)

        return sub.to_dict()

    async def create_customer_portal_session(
        self, session: AsyncSession, account: BillingAccount, return_url: str
    ) -> str:
        # Placeholder
        return ""

    async def handle_webhook(self, payload: bytes, signature: str) -> None:
        construct_event = cast(
            Callable[[bytes, str, str], object],
            stripe.Webhook.construct_event,
        )
        construct_event(
            payload,
            signature,
            get_settings().stripe_webhook_secret,
        )
        # Event processing would happen here
