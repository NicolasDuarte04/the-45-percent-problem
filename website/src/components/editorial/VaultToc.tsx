"use client";

import { useEffect, useRef, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

type Phase = "passed" | "active" | "future";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Sticky table of contents for VaultArticle. Scans the rendered
 * `.vault-prose` column for h2/h3 elements after mount, then tracks the
 * currently visible section with a scroll listener.
 *
 * Reading-progress visualisation: a vertical bar to the left of each item
 * grows to 2px / full opacity for the active heading, and persists at 1px /
 * 0.4 opacity for headings the reader has already passed. Future headings
 * have no bar so the user's vertical position in the document is legible at
 * a glance.
 *
 * Footnote-to-TOC pulse: hovering an inline `[N]` ref in the prose pulses
 * the TOC item that owns the surrounding section, mirroring the matrix
 * crosshair pattern.
 *
 * Lives in the `.vault-side-rail` column (≥1280px only). MDX headings get
 * ids from rehype-slug; TSX headings without ids are slugified in place so
 * the in-page anchors still resolve.
 */
export function VaultToc() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prose = document.querySelector<HTMLElement>(".vault-prose");
    if (!prose) return;

    const headings = Array.from(
      prose.querySelectorAll<HTMLHeadingElement>("h2, h3"),
    ).filter((h) => !h.closest(".vault-fns"));

    const next: TocItem[] = headings.map((h) => {
      if (!h.id) h.id = slugify(h.textContent ?? "");
      return {
        id: h.id,
        text: h.textContent ?? "",
        level: h.tagName === "H2" ? 2 : 3,
      };
    });
    // Reading TOC entries from the DOM is a one-time external sync; the
    // ESLint rule's "derive from props/state" suggestion does not apply
    // because the source of truth is the rendered prose tree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(next);

    if (next.length === 0) return;

    const compute = () => {
      const offset = 120;
      let current = headings[0]?.id ?? null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top - offset <= 0) current = h.id;
        else break;
      }
      setActiveId(current);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  // Footnote-to-TOC pulse. Walk the prose in document order, associating
  // every .vault-fnref with the most recent preceding h2/h3, then attach
  // mouseenter listeners. Re-run when items change so newly-mounted MDX
  // (e.g., dynamic content) is captured.
  useEffect(() => {
    const prose = document.querySelector<HTMLElement>(".vault-prose");
    if (!prose || items.length === 0) return;

    const fnToHeading = new Map<Element, string>();
    let currentHeading: string | null = null;
    let firstHeading: string | null = null;
    const orphanFnRefs: Element[] = [];
    const ordered = prose.querySelectorAll("h2, h3, .vault-fnref");
    ordered.forEach((el) => {
      if (el.tagName === "H2" || el.tagName === "H3") {
        if ((el as HTMLElement).closest(".vault-fns")) return;
        const id = (el as HTMLElement).id || null;
        if (!firstHeading) firstHeading = id;
        currentHeading = id;
      } else if (currentHeading) {
        fnToHeading.set(el, currentHeading);
      } else {
        // Footnote refs in the lead, before any heading. Resolve them after
        // the walk once the first heading has been found.
        orphanFnRefs.push(el);
      }
    });
    if (firstHeading) {
      orphanFnRefs.forEach((el) => fnToHeading.set(el, firstHeading!));
    }

    const triggerPulse = (headingId: string) => {
      setPulseId(headingId);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setPulseId(null), 600);
    };

    const cleanups: Array<() => void> = [];
    fnToHeading.forEach((headingId, el) => {
      const onEnter = () => triggerPulse(headingId);
      el.addEventListener("mouseenter", onEnter);
      cleanups.push(() => el.removeEventListener("mouseenter", onEnter));
    });

    return () => {
      cleanups.forEach((fn) => fn());
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, [items]);

  if (items.length === 0) return null;

  const activeIdx = activeId
    ? items.findIndex((i) => i.id === activeId)
    : -1;
  const phaseFor = (idx: number): Phase => {
    if (activeIdx < 0) return "future";
    if (idx < activeIdx) return "passed";
    if (idx === activeIdx) return "active";
    return "future";
  };

  return (
    <nav className="vault-toc" aria-label="Table of contents">
      <div className="vault-toc-eyebrow">Contents</div>
      <ol className="vault-toc-list">
        {items.map((item, idx) => {
          const phase = phaseFor(idx);
          const isPulsing = pulseId === item.id;
          return (
            <li
              key={item.id}
              className={
                "vault-toc-item" +
                (item.level === 3 ? " vault-toc-item--sub" : "") +
                (phase === "active" ? " vault-toc-item--active" : "") +
                (phase === "passed" ? " vault-toc-item--passed" : "") +
                (isPulsing ? " vault-toc-item--pulse" : "")
              }
              data-phase={phase}
            >
              <a href={`#${item.id}`}>{item.text}</a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
