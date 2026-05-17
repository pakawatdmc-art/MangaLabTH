"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Invisible component that sends periodic heartbeats to the backend
 * for real-time visitor tracking.  Should be mounted in the public layout.
 */
export function RealtimeHeartbeat() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    // Generate or retrieve session ID
    let sid = sessionStorage.getItem("mlth_session_id");
    if (!sid) {
      sid = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      sessionStorage.setItem("mlth_session_id", sid);
    }
    sessionIdRef.current = sid;
  }, []);

  useEffect(() => {
    const sendHeartbeat = async () => {
      if (!sessionIdRef.current) return;
      try {
        await fetch("/api/v1/realtime/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            current_page: pathname,
            referrer: document.referrer || null,
          }),
          // Use keepalive so the request completes even if user navigates away
          keepalive: true,
        });
      } catch {
        // Silently ignore — heartbeat failure is non-critical
      }
    };

    // Send immediately on mount / page change
    sendHeartbeat();

    // Then send every 30 seconds
    const interval = setInterval(sendHeartbeat, 30_000);

    return () => clearInterval(interval);
  }, [pathname]);

  // This component renders nothing
  return null;
}
