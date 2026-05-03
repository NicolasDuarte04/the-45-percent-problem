import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { render } from "@react-email/render";
import { loadBriefByDate } from "@/lib/brief";
import { DailyBriefEmail } from "@/emails/DailyBriefEmail";

// Past briefs are immutable once written; long ISR window (1 day) keeps them
// hot in the CDN. Live "today" view is served from the same route — the
// revalidate window matches the cron cadence so a freshly written brief
// surfaces within 10 minutes of dispatch even before Phase 4's targeted
// revalidation webhook lands.
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const brief = await loadBriefByDate(date).catch(() => null);
  if (!brief) {
    return { title: `Brief ${date} not found | 45analytics` };
  }
  return {
    title: `Brief — ${brief.brief_date} (Issue ${String(brief.issue_number).padStart(3, "0")}) | 45analytics`,
    description: brief.headline.summary_line,
  };
}

export default async function BriefArchiveDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const brief = await loadBriefByDate(date);
  if (!brief) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const html = await render(
    DailyBriefEmail({ brief, siteUrl: siteUrl || undefined }),
  );

  const issueLabel = String(brief.issue_number).padStart(3, "0");

  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)",
        color: "var(--text-primary)",
      }}
    >
      <header style={{ maxWidth: 720, marginBottom: 24 }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          <Link href="/briefs" style={{ color: "var(--text-tertiary)" }}>
            Brief archive
          </Link>
          {" · "}
          <span style={{ color: "var(--text-primary)" }}>
            Issue {issueLabel} · {brief.brief_date}
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            fontSize: 28,
            lineHeight: 1.2,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          {brief.headline.summary_line}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--text-tertiary)",
            margin: "12px 0 0",
          }}
        >
          {brief.headline.movers_line}
        </p>
      </header>

      <BriefIframe html={html} title={`Brief ${brief.brief_date}`} />
    </div>
  );
}

/**
 * The email template renders to a complete HTML document (Html / Head / Body).
 * Mounting that inside a Next.js page would nest <html> tags. An iframe with
 * srcDoc isolates the email's HTML and CSS from the surrounding editorial
 * canvas, and matches what the email looks like in a mail client almost
 * exactly. Resizing is handled by the inline script that posts the rendered
 * height back to the parent on load.
 */
function BriefIframe({ html, title }: { html: string; title: string }) {
  // Inject a tiny height-reporter into the iframe document so the parent can
  // size the iframe to its content (no scrollbars, full inline read).
  const heightReporterScript = `
    <script>
      (function () {
        function postSize() {
          var h = Math.max(
            document.documentElement.scrollHeight || 0,
            document.body.scrollHeight || 0
          );
          parent.postMessage({ type: "brief-iframe-height", height: h }, "*");
        }
        if (document.readyState === "complete") postSize();
        else window.addEventListener("load", postSize);
        window.addEventListener("resize", postSize);
        var img = document.images;
        for (var i = 0; i < img.length; i++) {
          img[i].addEventListener("load", postSize);
        }
      })();
    </script>
  `;
  const augmented = html.replace("</body>", `${heightReporterScript}</body>`);

  return (
    <>
      <iframe
        title={title}
        srcDoc={augmented}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          minHeight: "100vh",
          border: "1px solid var(--rule)",
          borderRadius: 2,
          background: "var(--bg-panel-elev)",
        }}
        id="brief-iframe"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              window.addEventListener("message", function (e) {
                if (!e.data || e.data.type !== "brief-iframe-height") return;
                var f = document.getElementById("brief-iframe");
                if (f && typeof e.data.height === "number") {
                  f.style.height = (e.data.height + 24) + "px";
                  f.style.minHeight = "auto";
                }
              });
            })();
          `,
        }}
      />
    </>
  );
}
