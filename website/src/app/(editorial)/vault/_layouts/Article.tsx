import type { ReactNode } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Byline } from "@/components/editorial/Byline";
import { CiteChip } from "@/components/editorial/CiteChip";
import { VaultToc } from "@/components/editorial/VaultToc";
import { loadSnapshotMeta } from "@/lib/data/loadSnapshot";

export interface VaultArticleProps {
  eyebrow: string;
  title: string;
  deck?: ReactNode;
  readingTimeMinutes?: number;
  lastRevised?: string;
  /** Author attribution. Defaults to the project house byline. */
  author?: string;
  /** Optional DOI rendered in the byline row. */
  doi?: string;
  /** Citation artifacts surfaced at the foot of the article. §8.11 */
  citation?: {
    bibtex: string;
    apa?: string;
  };
  /** What to read next — rendered as a small outbound list beneath citation. */
  readNext?: Array<{ href: string; title: string; blurb?: string }>;
  children: ReactNode;
}

/**
 * §8.3 — VaultArticle layout. Applies the editorial canvas and enforces
 * the 68ch reading column / 220px side rail grid.
 *
 * MDX pages under app/(editorial)/vault/[slug]/page.mdx render inside this
 * component. The `data-canvas="editorial"` attribute is set on the route
 * group layout, so this component relies on that ancestor for palette tokens.
 */
export function VaultArticle({
  eyebrow,
  title,
  deck,
  readingTimeMinutes,
  lastRevised,
  author = "The 45% Problem project",
  doi,
  citation,
  readNext,
  children,
}: VaultArticleProps) {
  const meta = loadSnapshotMeta();

  const metaLine: string[] = [];
  if (readingTimeMinutes) metaLine.push(`${readingTimeMinutes} min read`);
  if (lastRevised) metaLine.push(`last revised ${lastRevised}`);
  metaLine.push(`snapshot ${meta.snapshot_id}`);

  return (
    <article>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="mx-auto"
        style={{
          maxWidth: 1152,
          padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px) clamp(32px, 5vw, 48px)",
        }}
      >
        <div style={{ maxWidth: "68ch" }}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
            <Eyebrow style={{ margin: 0 }}>{eyebrow}</Eyebrow>
            {metaLine.map((item, i) => (
              <span
                key={i}
                className="vault-eyebrow"
                style={{ color: "var(--text-quiet)" }}
              >
                <span aria-hidden style={{ marginRight: 12 }}>
                  ·
                </span>
                {item}
              </span>
            ))}
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 48,
              lineHeight: "56px",
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
              margin: "0 0 24px",
            }}
          >
            {title}
          </h1>

          {deck ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 20,
                lineHeight: "32px",
                color: "var(--text-tertiary)",
                margin: "0 0 32px",
              }}
            >
              {deck}
            </p>
          ) : null}

          <Byline author={author} codeSha={meta.code_sha} doi={doi} />
        </div>
        <div style={{ marginTop: "clamp(32px, 5vw, 48px)", borderTop: "1px solid var(--rule)" }} />
      </header>

      {/* ── Body grid ────────────────────────────────────────────────────── */}
      <div
        className="mx-auto vault-article-grid"
        style={{
          maxWidth: 1152,
          padding: "16px clamp(16px, 4vw, 48px) clamp(64px, 10vw, 96px)",
        }}
      >
        {/* Mobile / tablet TOC: collapsible <details> shown only below 1280px,
            hidden when the side-rail kicks in. Same VaultToc internals so the
            scroll-tracking and footnote-pulse behaviours stay consistent. */}
        <div className="vault-toc-mobile">
          <details>
            <summary className="vault-toc-mobile-summary">
              <span className="vault-toc-eyebrow" style={{ marginBottom: 0 }}>
                Contents
              </span>
              <span className="vault-toc-mobile-chevron" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="vault-toc-mobile-body">
              <VaultToc />
            </div>
          </details>
        </div>
        <div className="vault-prose" style={{ maxWidth: "68ch", minWidth: 0 }}>
          {children}
        </div>
        <div className="vault-side-rail">
          <VaultToc />
        </div>
      </div>

      {/* ── Footer — footnotes, citation, what to read next ──────────────── */}
      <footer
        className="mx-auto"
        style={{
          maxWidth: 1152,
          padding: "clamp(32px, 5vw, 48px) clamp(16px, 4vw, 48px) clamp(64px, 10vw, 96px)",
          borderTop: "1px solid var(--rule)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 48,
            maxWidth: "68ch",
          }}
        >
          {citation ? (
            <section aria-labelledby="cite-heading">
              <h3
                id="cite-heading"
                className="vault-eyebrow"
                style={{ margin: "0 0 12px" }}
              >
                Cite this snapshot
              </h3>
              <CiteChip bibtex={citation.bibtex} apa={citation.apa} />
            </section>
          ) : null}

          {readNext && readNext.length > 0 ? (
            <section aria-labelledby="read-next-heading">
              <h3
                id="read-next-heading"
                className="vault-eyebrow"
                style={{ margin: "0 0 16px" }}
              >
                What to read next
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gap: 16,
                }}
              >
                {readNext.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        borderLeft: "2px solid var(--rule)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 18,
                          fontWeight: 500,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        {item.title}
                      </span>
                      {item.blurb ? (
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {item.blurb}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
