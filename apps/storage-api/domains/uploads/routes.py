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


UPLOAD_ROUTES: dict[str, UploadRoute] = {
    "organization.primaryLogo": UploadRoute(
        key="organization.primaryLogo",
        purpose="organization_logo",
        owner_type="organization",
        allowed_content_types=("image/png", "image/jpeg", "image/webp"),
        max_size_bytes=5 * 1024 * 1024,
        category="attachment",
        audience="public",
        key_template="organizations/{owner_id}/branding/{file_id}/{version_id}",
    )
}
