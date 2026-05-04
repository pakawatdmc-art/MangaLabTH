import io
from PIL import Image

# Limit max decompressed image size to ~50 megapixels (≈7000×7000)
# to prevent decompression bomb attacks that could OOM the server.
Image.MAX_IMAGE_PIXELS = 50_000_000

from typing import Optional

def process_image_to_webp(image_bytes: bytes, quality: int = 80, max_width: Optional[int] = None) -> tuple[bytes, str]:
    """
    Process an image: optionally resize, convert to WebP, and return bytes with its new content type.
    If it's already WebP, it still re-saves to ensure optimization/scaling.
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # WebP supports transparency, so keep alpha channel for RGBA/palette images.
    # For opaque images (RGB, L, etc.), convert to RGB to avoid unnecessary alpha.
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")  # Preserve transparency
    else:
        img = img.convert("RGB")   # Flatten to opaque
        
    # Resize if max_width is provided and image is wider than max_width
    if max_width and img.width > max_width:
        ratio = max_width / float(img.width)
        new_height = int((float(img.height) * float(ratio)))
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, method=4) # method 4 = good balance of speed vs compression (6 is ~3x slower for only ~5% smaller)
    
    return output.getvalue(), "image/webp", img.width, img.height
