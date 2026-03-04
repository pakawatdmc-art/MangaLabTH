import io
from PIL import Image

def process_image_to_webp(image_bytes: bytes, quality: int = 80) -> tuple[bytes, str]:
    """
    Process an image: convert to WebP and return bytes with its new content type.
    If it's already WebP, it still re-saves to ensure optimization/scaling.
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # WebP supports transparency, so keep alpha channel for RGBA/palette images.
    # For opaque images (RGB, L, etc.), convert to RGB to avoid unnecessary alpha.
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")  # Preserve transparency
    else:
        img = img.convert("RGB")   # Flatten to opaque
        
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, method=6) # method 6 = slow but better compression
    
    return output.getvalue(), "image/webp"
