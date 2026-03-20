"""Shared HTTP client for external API calls.

Using a singleton AsyncClient allows connection pooling and reuse,
significantly reducing TCP overhead for repeated calls to Clerk API,
FeelFreePay API, etc.
"""

import httpx
from typing import Optional

# Singleton client — initialized lazily, closed during app shutdown
_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    """Get or create the shared AsyncClient singleton."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            follow_redirects=True,
        )
    return _client


async def close_http_client() -> None:
    """Close the shared client. Call during app shutdown."""
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
