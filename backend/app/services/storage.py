"""Cloudflare R2 (S3-compatible) storage service for manga images.

Provides presigned URL generation for direct browser uploads
and server-side upload/delete helpers.
"""

from typing import Optional

import boto3
from botocore.config import Config as BotoConfig

from app.config import get_settings

settings = get_settings()

_client = None


def _get_r2_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=BotoConfig(
                signature_version="s3v4",
                region_name="auto",
            ),
        )
    return _client


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


def delete_object(key: str) -> None:
    """Delete a single object from R2."""
    client = _get_r2_client()
    client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)


def delete_objects(keys: list[str]) -> None:
    """Batch delete objects from R2."""
    if not keys:
        return
    client = _get_r2_client()
    client.delete_objects(
        Bucket=settings.R2_BUCKET_NAME,
        Delete={"Objects": [{"Key": k} for k in keys]},
    )
