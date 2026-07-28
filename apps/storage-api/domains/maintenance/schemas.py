from typing import Literal

from pydantic import BaseModel


class StorageSweepResponse(BaseModel):
    object: Literal["storage_sweep"] = "storage_sweep"
    reclaimed: int
    soft_deleted: int
    abandoned: int
    reservations_released: int
    reservation_bytes_released: int
    usage_subjects_checked: int
    usage_subjects_repaired: int
    usage_drift_bytes: int
