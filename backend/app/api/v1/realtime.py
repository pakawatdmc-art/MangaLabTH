"""Real-time visitor tracking — in-memory heartbeat store.

Public visitors send periodic heartbeats; the admin dashboard queries
the aggregated data.  All state lives in-process memory so there is
zero database overhead.  Sessions that stop sending heartbeats are
automatically evicted after EXPIRY_SECONDS.
"""

import time
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from user_agents import parse as parse_ua

from app.api.deps import AdminUser

router = APIRouter(prefix="/realtime", tags=["realtime"])

# ── Configuration ────────────────────────────────────────────────────
EXPIRY_SECONDS = 90          # session considered dead after this
CLEANUP_INTERVAL = 30        # run cleanup at most every N seconds

# ── In-memory store ──────────────────────────────────────────────────
# { session_id: { ... session data ... } }
_sessions: dict[str, dict] = {}
_last_cleanup: float = 0.0


def _cleanup() -> None:
    """Remove expired sessions (lazy, called on every heartbeat/query)."""
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup < CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    expired = [sid for sid, s in _sessions.items()
               if now - s["last_seen"] > EXPIRY_SECONDS]
    for sid in expired:
        del _sessions[sid]


def _detect_device(ua_string: str) -> dict:
    """Parse User-Agent into device info."""
    try:
        ua = parse_ua(ua_string)
        if ua.is_mobile:
            device_type = "mobile"
        elif ua.is_tablet:
            device_type = "tablet"
        else:
            device_type = "desktop"
        return {
            "type": device_type,
            "browser": f"{ua.browser.family}",
            "os": f"{ua.os.family}",
        }
    except Exception:
        return {"type": "unknown", "browser": "Unknown", "os": "Unknown"}


# ── Schemas ──────────────────────────────────────────────────────────

class HeartbeatPayload(BaseModel):
    session_id: str = Field(..., max_length=64)
    current_page: str = Field(..., max_length=512)
    referrer: Optional[str] = Field(None, max_length=512)


class ActiveResponse(BaseModel):
    active_users: int
    sessions: list[dict]
    pages: list[dict]
    devices: dict


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/heartbeat", status_code=204)
async def heartbeat(payload: HeartbeatPayload, request: Request):
    """Record a visitor heartbeat.  Called every ~30s by the public frontend."""
    _cleanup()

    ua_string = request.headers.get("user-agent", "")
    device = _detect_device(ua_string)

    now = time.time()
    existing = _sessions.get(payload.session_id)

    _sessions[payload.session_id] = {
        "session_id": payload.session_id,
        "current_page": payload.current_page,
        "referrer": payload.referrer or "",
        "device": device,
        "user_agent": ua_string[:256],
        "ip": request.client.host if request.client else "unknown",
        "first_seen": existing["first_seen"] if existing else now,
        "last_seen": now,
    }

    return None


@router.get("/active")
async def get_active(admin: AdminUser):
    """Return real-time active visitor data (admin only)."""
    _cleanup()

    now = time.time()
    active = [s for s in _sessions.values()
              if now - s["last_seen"] <= EXPIRY_SECONDS]

    # ── Page aggregation ─────────────────────────────────────────────
    page_counts: dict[str, int] = defaultdict(int)
    for s in active:
        page = s["current_page"]
        # Simplify page paths for grouping
        if page.startswith("/manga/"):
            parts = page.split("/")
            if len(parts) >= 3:
                page_label = f"/manga/{parts[2]}"
                if len(parts) >= 4:
                    page_label += f" (Ch.{parts[3]})" if parts[3].isdigit() else f"/{parts[3]}"
            else:
                page_label = page
        else:
            page_label = page

        page_counts[page_label] += 1

    pages_sorted = sorted(
        [{"page": p, "count": c} for p, c in page_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:20]

    # ── Device aggregation ───────────────────────────────────────────
    device_counts: dict[str, int] = defaultdict(int)
    for s in active:
        device_counts[s["device"]["type"]] += 1

    # ── Session list (sanitised for admin view) ──────────────────────
    session_list = []
    for s in active:
        duration_sec = int(now - s["first_seen"])
        mins, secs = divmod(duration_sec, 60)
        session_list.append({
            "session_id": s["session_id"][:8] + "...",
            "current_page": s["current_page"],
            "device": s["device"],
            "duration": f"{mins}m {secs}s",
            "duration_seconds": duration_sec,
            "last_seen_ago": f"{int(now - s['last_seen'])}s ago",
        })

    # Sort by most recently active
    session_list.sort(key=lambda x: x["duration_seconds"], reverse=True)

    return ActiveResponse(
        active_users=len(active),
        sessions=session_list[:50],
        pages=pages_sorted,
        devices=dict(device_counts),
    )
