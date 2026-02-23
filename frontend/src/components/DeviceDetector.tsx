"use client";

import { useEffect } from "react";
import { isIOS, isMacOs } from "react-device-detect";

export function DeviceDetector() {
    useEffect(() => {
        // If not iOS and not macOS, add a class to body to hide Apple login
        if (!isIOS && !isMacOs) {
            document.body.classList.add("not-apple-device");
        }
    }, []);

    return null;
}
