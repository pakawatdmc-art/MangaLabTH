"""Cloudflare R2 (S3-compatible) storage service for manga images.

Provides presigned URL generation for direct browser uploads
and server-side upload/delete helpers.

Environment variables required:
    R2_ENDPOINT_URL       — e.g. https://<account_id>.r2.cloudflarestorage.com
    R2_ACCESS_KEY_ID      — R2 API token Access Key ID
    R2_SECRET_ACCESS_KEY  — R2 API token Secret Access Key
    R2_BUCKET_NAME        — Target bucket (default: mangafactory)
    R2_PUBLIC_URL         — Public URL prefix, e.g. https://pub-xxx.r2.dev
"""

from typing import List, Optional

import boto3  # type: ignore
from botocore.config import Config as BotoConfig  # type: ignore
from fastapi import Request

from app.config import get_settings

settings = get_settings()

_client = None


def _get_r2_client():
    """Lazy-init a thread-safe boto3 S3 client pointed at Cloudflare R2."""
    global _client
    if _client is None:
        settings.validate_r2_config()
        _client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=BotoConfig(
                signature_version="s3v4",
                region_name="auto",
            ),
        )
    return _client


# ── Shared Utilities ─────────────────────────────


def r2_url_to_key(url: str) -> Optional[str]:
    """Extract the R2 object key from a public URL.

    Example:
        "https://pub-xxx.r2.dev/covers/abc.webp" → "covers/abc.webp"

    Returns None if the URL does not contain the expected ".r2.dev/" marker.
    """
    parts = url.split(".r2.dev/", 1)
    return parts[1] if len(parts) == 2 else None


def get_client_ip(request: Request) -> str:
    """Get the real client IP, respecting X-Forwarded-For behind load balancers.

    Cloud Run (and most reverse proxies) set X-Forwarded-For.
    The leftmost IP is the original client.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── R2 Operations ────────────────────────────────


def generate_presigned_upload_url(
    key: str,
    content_type: str = "image/webp",
    expires_in: int = 600,
) -> dict:
    """Generate a presigned PUT URL for direct browser-to-R2 upload.

    Returns:
        {"upload_url": str, "public_url": str, "key": str}
    """
    client = _get_r2_client()
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.R2_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )
    public_url = f"{settings.R2_PUBLIC_URL}/{key}"
    return {"upload_url": upload_url, "public_url": public_url, "key": key}


def upload_file_to_r2(key: str, file_bytes: bytes, content_type: str = "image/webp") -> str:
    """Upload a file directly to R2 from the backend (bypasses browser CORS).

    Returns:
        The public URL of the uploaded object.
    """
    client = _get_r2_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"{settings.R2_PUBLIC_URL}/{key}"


def delete_object(key: str) -> None:
    """Delete a single object from R2."""
    client = _get_r2_client()
    client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)


def delete_objects(keys: List[str]) -> None:
    """Batch delete objects from R2."""
    if not keys:
        return
    client = _get_r2_client()
    client.delete_objects(
        Bucket=settings.R2_BUCKET_NAME,
        Delete={"Objects": [{"Key": k} for k in keys]},
    )
