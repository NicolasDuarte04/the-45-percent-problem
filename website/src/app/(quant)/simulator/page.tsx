/**
 * /simulator -> /scenario (cp-19 item 6).
 *
 * This route was an early read-only scaffold whose copy described the
 * interactive layer as "intentionally stubbed" and probabilities as "not yet
 * joined". The real, interactive Scenario Simulator shipped at /scenario (full
 * bracket), and the nav links there. Nothing in the app links to /simulator,
 * but stale external links and bookmarks may still hit it, so we permanently
 * redirect (308) rather than delete the route, landing visitors on the live
 * simulator instead of stale "not yet built" copy.
 */
import { permanentRedirect } from "next/navigation";

export default function LegacySimulatorRedirect(): never {
  permanentRedirect("/scenario");
}
