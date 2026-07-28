from fastapi import HTTPException, status


class AppHTTPException(HTTPException):
    """Expected application failure serialized through the canonical envelope."""

    def __init__(
        self,
        code: str = "storage/provider-error",
        message: str = "The storage provider could not complete the request.",
        http_status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> None:
        self.app_code = code
        self.app_message = message
        super().__init__(status_code=http_status_code, detail=message)


def provider_error() -> AppHTTPException:
    return AppHTTPException(
        code="storage/provider-error",
        message="The storage provider could not complete the request.",
        http_status_code=status.HTTP_502_BAD_GATEWAY,
    )


def quota_exceeded(message: str) -> AppHTTPException:
    return AppHTTPException(
        code="storage/quota-exceeded",
        message=message,
        http_status_code=status.HTTP_409_CONFLICT,
    )


def quota_suspended() -> AppHTTPException:
    return AppHTTPException(
        code="storage/quota-suspended",
        message="Storage uploads for this subject are suspended.",
        http_status_code=status.HTTP_403_FORBIDDEN,
    )
