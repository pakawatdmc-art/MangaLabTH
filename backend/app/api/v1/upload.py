"""Upload endpoints — presigned URL generation & direct proxy upload for R2."""

import time
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.api.deps import AdminUser
from app.services.storage import generate_presigned_upload_url, upload_file_to_r2

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


class CoverUploadResponse(BaseModel):
    public_url: str
    key: str


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


@router.post("/cover", response_model=CoverUploadResponse)
async def upload_cover(
    admin: AdminUser,
    file: UploadFile = File(...),
):
    """Admin: upload a cover image via backend proxy (avoids browser CORS)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="ไฟล์ต้องเป็นรูปภาพเท่านั้น")

    # Read file content (limit 10 MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ไฟล์ขนาดใหญ่เกินไป (สูงสุด 10 MB)")

    # Generate unique key
    safe_name = (file.filename or "cover.png").replace(" ", "_")
    key = f"covers/{int(time.time())}-{safe_name}"

    public_url = upload_file_to_r2(key, contents, file.content_type)
    return CoverUploadResponse(public_url=public_url, key=key)

