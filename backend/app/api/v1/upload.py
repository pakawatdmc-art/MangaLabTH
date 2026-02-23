"""Upload endpoints — presigned URL generation & direct proxy upload for R2."""

import re
import time
from typing import List

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import AdminUser
from app.services.storage import generate_presigned_upload_url, upload_file_to_r2

router = APIRouter(prefix="/upload", tags=["Upload"])

# ── Rate limiter (uses app.state.limiter from main) ──
limiter = Limiter(key_func=get_remote_address)

# ── V10: Magic byte validation ──────────────────
_IMAGE_SIGNATURES: dict[bytes, str] = {
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",  # WebP starts with RIFF....WEBP
    b"<svg": "image/svg+xml",
}


def _validate_image_bytes(data: bytes) -> bool:
    """V10: Check file magic bytes to verify it's actually an image."""
    for signature in _IMAGE_SIGNATURES:
        if data[:len(signature)] == signature:
            return True
    return False


# ── V5: Path traversal prevention ────────────────
_SAFE_KEY_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,500}$")


def _validate_storage_key(key: str) -> None:
    """V5: Reject keys that could cause path traversal or injection."""
    if not key or "\x00" in key:
        raise HTTPException(status_code=400, detail="Invalid storage key")
    if ".." in key:
        raise HTTPException(
            status_code=400, detail="Path traversal not allowed")
    if key.startswith("/") or key.startswith("\\"):
        raise HTTPException(
            status_code=400, detail="Absolute paths not allowed")
    if not _SAFE_KEY_PATTERN.match(key):
        raise HTTPException(
            status_code=400, detail="Invalid characters in storage key")


_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


class PresignedRequest(BaseModel):
    key: str
    content_type: str = "image/webp"

    @field_validator("key")
    @classmethod
    def validate_key(cls, v: str) -> str:
        if not v or ".." in v or "\x00" in v or v.startswith("/"):
            raise ValueError("Invalid storage key")
        return v

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        if v not in _ALLOWED_IMAGE_TYPES:
            raise ValueError(
                f"Content type must be one of: {_ALLOWED_IMAGE_TYPES}")
        return v


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
@limiter.limit("30/minute")
async def get_presigned_urls(
    request: Request,
    body: BatchPresignedRequest,
    admin: AdminUser,
):
    """Admin: generate presigned PUT URLs for direct browser-to-R2 upload."""
    if len(body.files) > 100:
        raise HTTPException(status_code=400, detail="Max 100 files per batch")

    results = []
    for f in body.files:
        # V5: Validate each key
        _validate_storage_key(f.key)
        data = generate_presigned_upload_url(
            key=f.key, content_type=f.content_type)
        results.append(PresignedResponse(**data))
    return results


@router.post("/cover", response_model=CoverUploadResponse)
@limiter.limit("10/minute")
async def upload_cover(
    request: Request,
    admin: AdminUser,
    file: UploadFile = File(...),
):
    """Admin: upload a cover image via backend proxy (avoids browser CORS)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, detail="ไฟล์ต้องเป็นรูปภาพเท่านั้น")

    # Read file content (limit 10 MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail="ไฟล์ขนาดใหญ่เกินไป (สูงสุด 10 MB)")

    # V10: Validate file is actually an image by magic bytes
    if not _validate_image_bytes(contents):
        raise HTTPException(
            status_code=400, detail="ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง")

    # Generate unique key
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "cover.png")
    key = f"covers/{int(time.time())}-{safe_name}"

    public_url = upload_file_to_r2(key, contents, file.content_type)
    return CoverUploadResponse(public_url=public_url, key=key)
