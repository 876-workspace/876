from dataclasses import dataclass


@dataclass(frozen=True)
class UploadRoute:
    key: str
    purpose: str
    owner_type: str
    allowed_content_types: tuple[str, ...]
    max_size_bytes: int
    category: str
    audience: str
    key_template: str


_IMAGE_TYPES = ("image/png", "image/jpeg", "image/webp")
_IMAGE_MAX_BYTES = 5 * 1024 * 1024


UPLOAD_ROUTES: dict[str, UploadRoute] = {
    "organization.primaryLogo": UploadRoute(
        key="organization.primaryLogo",
        purpose="organization_logo",
        owner_type="organization",
        allowed_content_types=_IMAGE_TYPES,
        max_size_bytes=_IMAGE_MAX_BYTES,
        category="attachment",
        audience="public",
        key_template="organizations/{owner_id}/branding/{file_id}/{version_id}",
    ),
    "app.logo": UploadRoute(
        key="app.logo",
        purpose="app_logo",
        owner_type="platform",
        allowed_content_types=_IMAGE_TYPES,
        max_size_bytes=_IMAGE_MAX_BYTES,
        category="attachment",
        audience="public",
        key_template="apps/{owner_id}/branding/{file_id}/{version_id}",
    ),
    "user.avatar": UploadRoute(
        key="user.avatar",
        purpose="user_avatar",
        owner_type="user",
        allowed_content_types=_IMAGE_TYPES,
        max_size_bytes=_IMAGE_MAX_BYTES,
        category="attachment",
        audience="public",
        key_template="users/{owner_id}/avatar/{file_id}/{version_id}",
    ),
    "billing.itemImage": UploadRoute(
        key="billing.itemImage",
        purpose="billing_item_image",
        owner_type="organization",
        allowed_content_types=_IMAGE_TYPES,
        max_size_bytes=_IMAGE_MAX_BYTES,
        category="attachment",
        audience="public",
        key_template="organizations/{owner_id}/billing/item-media/{file_id}/{version_id}",
    ),
    "billing.itemVariantImage": UploadRoute(
        key="billing.itemVariantImage",
        purpose="billing_item_variant_image",
        owner_type="organization",
        allowed_content_types=_IMAGE_TYPES,
        max_size_bytes=_IMAGE_MAX_BYTES,
        category="attachment",
        audience="public",
        key_template="organizations/{owner_id}/billing/item-variant-media/{file_id}/{version_id}",
    ),
    "billing.paymentModeImage": UploadRoute(
        key="billing.paymentModeImage",
        purpose="billing_payment_mode_image",
        owner_type="organization",
        allowed_content_types=_IMAGE_TYPES,
        max_size_bytes=_IMAGE_MAX_BYTES,
        category="attachment",
        audience="public",
        key_template="organizations/{owner_id}/billing/payment-mode-images/{file_id}/{version_id}",
    ),
}
