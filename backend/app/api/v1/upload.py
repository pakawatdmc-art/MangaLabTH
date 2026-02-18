"""Upload endpoints — presigned URL generation for R2."""

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import AdminUser
from app.services.storage import generate_presigned_upload_url

router = APIRouter(prefix="/upload", tags=["Upload"])


class PresignedRequest(BaseModel):
    key: str
    content_type: str = "image/webp"


class PresignedResponse(BaseModel):
    upload_url: str
    public_url: str
    key: str


class BatchPresignedRequest(BaseModel):
    files: List[PresignedRequest]


@router.post("/presigned", response_model=List[PresignedResponse])
async def get_presigned_urls(
    body: BatchPresignedRequest,
    admin: AdminUser,
):
    """Admin: generate presigned PUT URLs for direct browser-to-R2 upload."""
    if len(body.files) > 100:
        raise HTTPException(status_code=400, detail="Max 100 files per batch")

    results = []
    for f in body.files:
        data = generate_presigned_upload_url(key=f.key, content_type=f.content_type)
        results.append(PresignedResponse(**data))
    return results
