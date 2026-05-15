import type { Metadata } from "next";

import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import {
  ForecastDesk,
  ForecastDeskUnauthenticated,
} from "@/components/simulator/ForecastDesk";
import { getOperatorSession } from "@/lib/sim/getOperatorSession";
import { getUserPredictions } from "@/lib/sim/getUserPredictions";

// /me is per-user state. Static caching would leak predictions across
// requests, and a stale render would defeat the purpose of the page.
// `force-dynamic` is required, not nice-to-have.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  // Link-public surface gated by a signed cookie. Crawlers must not
  // index it (and could not see the authenticated view anyway).
  robots: { index: false, follow: false },
  title: "Forecast Desk · 45analytics",
};

/**
 * Forecast Desk for returning operators (P0.3, Checkpoint 8).
 *
 * Server flow:
 *   1. Read the signed `45a:sim:owner` cookie via getOperatorSession.
 *   2. If missing or invalid: render the unauthenticated empty state.
 *      Do not redirect; direct-link sharing of /me should resolve to
 *      a useful page, not a 302 that breaks the link.
 *   3. If valid: query the user's predictions through the shared
 *      `getUserPredictions` helper and render the Forecast Desk.
 *
 * Authentication parity: the same cookie-and-helper pair powers the
 * `GET /api/predictions?email=` endpoint. Both call sites prove
 * ownership server-side before reading rows; the helper itself is a
 * pure read keyed on the email argument.
 */
export default async function MePage() {
  const operator = await getOperatorSession();

  if (!operator) {
    return (
      <SimulatorChrome width="narrow">
        <ForecastDeskUnauthenticated />
      </SimulatorChrome>
    );
  }

  const predictions = await getUserPredictions(operator.email);

  return (
    <SimulatorChrome width="narrow">
      <ForecastDesk email={operator.email} predictions={predictions} />
    </SimulatorChrome>
  );
}
