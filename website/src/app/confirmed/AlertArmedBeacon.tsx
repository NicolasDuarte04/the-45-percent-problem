"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

export function AlertArmedBeacon() {
  useEffect(() => {
    track("alert_armed");
  }, []);
  return null;
}
