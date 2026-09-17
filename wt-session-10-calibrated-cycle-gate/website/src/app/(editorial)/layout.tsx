import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { OnboardingController } from "@/components/onboarding/OnboardingController";
import { getOnboardingLeader } from "@/lib/data/onboardingLeader";

// Checkpoint 17 follow-up: the operator cookie is read by the
// EditorialMasthead client island (via /api/me/session-status) so
// this layout no longer touches request data. That keeps every page
// in the (editorial) group eligible for static prerendering. The
// previous pattern read the cookie here, which silently disabled the
// Desk tab on every statically prerendered route.
//
// cp-08 additive onboarding: the OnboardingController mounts here
// rather than at the homepage so the modal is reachable from the
// masthead "First time?" pill on every editorial page. The chip is
// scoped to the home path inside the controller (via usePathname()),
// so non-home editorial routes see no chip. The leader-name and
// p_champion values for the modal's claim-02 prose are derived from
// the live snapshot at build time via a minimal helper that reads
// only snapshot_meta.json and tournament.json (no mergeTournament
// pipeline), keeping the per-render cost small for /brief, /vault,
// /methodology, etc.
//
// OSF link is hardcoded to the project's preregistration ID; the
// design package's `osf.io/8b5hd` is a placeholder.
const OSF_URL = "osf.io/spmkg";

export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { leaderName, leaderP, mcRuns } = getOnboardingLeader();
  const leaderPDisplay = (leaderP * 100).toFixed(1);
  const mcRunsDisplay = mcRuns.toLocaleString("en-US");

  return (
    <div data-canvas="editorial">
      <EditorialMasthead />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
      <OnboardingController
        leaderName={leaderName}
        leaderPDisplay={leaderPDisplay}
        mcRunsDisplay={mcRunsDisplay}
        osfUrl={OSF_URL}
      />
    </div>
  );
}
