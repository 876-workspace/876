from typing import Literal

from pydantic import BaseModel


class StorageSweepResponse(BaseModel):
    object: Literal["storage_sweep"] = "storage_sweep"
    reclaimed: int
    soft_deleted: int
    abandoned: int
