"use client";

import { useCallback } from "react";
import { SectionHead } from "@/components/compositions/SectionHead";

const TRAILER_SECTION_ID = "trailer";

/**
 * In-page anchor button styled to match `GhostLink` in SectionHead. Smooth
 * scrolls to the inline trailer section.
 */
export function WatchTrailerButton() {
  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(TRAILER_SECTION_ID);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <a
      href={`#${TRAILER_SECTION_ID}`}
      onClick={onClick}
      className="no-underline inline-flex items-center"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--text-primary)",
        border: "1px solid rgb(31 31 31 / 0.28)",
        borderRadius: 6,
        padding: "6px 12px",
        gap: 4,
        background: "transparent",
      }}
    >
      Watch the trailer ↓
    </a>
  );
}

interface TrailerSectionProps {
  src?: string;
  eyebrow?: string;
  title?: string;
}

export function TrailerSection({
  src = "/assets/trailer.mp4",
  eyebrow = "Interlude · Trailer",
  title = "The project, in motion",
}: TrailerSectionProps) {
  return (
    <section id={TRAILER_SECTION_ID} style={{ marginBottom: 56 }}>
      <SectionHead eyebrow={eyebrow} title={title} />
      <div
        className="rounded-2xl overflow-hidden border"
        style={{
          background: "var(--bg-panel-elev)",
          borderColor: "var(--rule)",
          boxShadow:
            "0 1px 3px rgb(0 0 0 / 0.04), 0 6px 24px rgb(0 0 0 / 0.05)",
          aspectRatio: "16 / 9",
          width: "100%",
        }}
      >
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </section>
  );
}
