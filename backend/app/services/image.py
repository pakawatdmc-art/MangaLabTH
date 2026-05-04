import io
import logging
from PIL import Image

logger = logging.getLogger(__name__)

# Limit max decompressed image size to ~50 megapixels (≈7000×7000)
# to prevent decompression bomb attacks that could OOM the server.
Image.MAX_IMAGE_PIXELS = 50_000_000

from typing import Optional

def process_image_to_webp(image_bytes: bytes, quality: int = 80, max_width: Optional[int] = None) -> tuple[bytes, str, int, int]:
    """
    Process an image: optionally resize, convert to WebP, and return bytes with its new content type.
    If it's already WebP and no resize is needed, skip re-encoding to save memory and CPU.
    """
    input_size_kb = len(image_bytes) / 1024
    logger.info("[ImageProcess] Start — input %.1f KB", input_size_kb)

    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        logger.error("[ImageProcess] Pillow cannot open image: %s", e)
        raise

    original_format = img.format  # e.g. "WEBP", "JPEG", "PNG"
    original_mode = img.mode
    logger.info(
        "[ImageProcess] Decoded — format=%s, mode=%s, size=%dx%d (%.1f MP)",
        original_format, original_mode, img.width, img.height,
        (img.width * img.height) / 1_000_000
    )

    # Check if re-encoding can be skipped:
    # Already WebP + no resize needed + no mode conversion needed
    needs_resize = max_width and img.width > max_width
    is_already_webp = original_format == "WEBP"
    is_safe_mode = original_mode in ("RGB", "RGBA")

    if is_already_webp and not needs_resize and is_safe_mode:
        logger.info(
            "[ImageProcess] Already WebP (no resize needed) — skipping re-encode, returning as-is (%.1f KB)",
            input_size_kb
        )
        return image_bytes, "image/webp", img.width, img.height

    # WebP supports transparency, so keep alpha channel for RGBA/palette images.
    # For opaque images (RGB, L, etc.), convert to RGB to avoid unnecessary alpha.
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")  # Preserve transparency
    else:
        img = img.convert("RGB")   # Flatten to opaque
        
    # Resize if max_width is provided and image is wider than max_width
    if needs_resize:
        ratio = max_width / float(img.width)
        new_height = int((float(img.height) * float(ratio)))
        logger.info("[ImageProcess] Resizing %dx%d → %dx%d", img.width, img.height, max_width, new_height)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, method=4) # method 4 = good balance of speed vs compression (6 is ~3x slower for only ~5% smaller)
    
    result_bytes = output.getvalue()
    result_size_kb = len(result_bytes) / 1024
    logger.info(
        "[ImageProcess] Done — output %.1f KB (%.0f%% of input), final size=%dx%d",
        result_size_kb, (result_size_kb / input_size_kb * 100) if input_size_kb > 0 else 0,
        img.width, img.height
    )

    return result_bytes, "image/webp", img.width, img.height
