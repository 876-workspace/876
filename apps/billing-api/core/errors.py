from fastapi import HTTPException, status


class AppHTTPException(HTTPException):
    """Expected application failure serialized through the canonical envelope."""

    def __init__(
        self,
        code: str = "billing/internal-error",
        message: str = "Internal error.",
        http_status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> None:
        self.app_code = code
        self.app_message = message
        super().__init__(status_code=http_status_code, detail=message)
