"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

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
 * currently visible section with an IntersectionObserver.
 *
 * Lives in the `.vault-side-rail` column (≥1280px only). MDX headings get
 * ids from rehype-slug; TSX headings without ids are slugified in place so
 * the in-page anchors still resolve.
 */
export function VaultToc() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const prose = document.querySelector<HTMLElement>(".vault-prose");
    if (!prose) return;

    const headings = Array.from(
      prose.querySelectorAll<HTMLHeadingElement>("h2, h3"),
    );

    const next: TocItem[] = headings.map((h) => {
      if (!h.id) h.id = slugify(h.textContent ?? "");
      return {
        id: h.id,
        text: h.textContent ?? "",
        level: h.tagName === "H2" ? 2 : 3,
      };
    });
    setItems(next);

    if (next.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <nav className="vault-toc" aria-label="Table of contents">
      <div className="vault-toc-eyebrow">Contents</div>
      <ol className="vault-toc-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={
              "vault-toc-item" +
              (item.level === 3 ? " vault-toc-item--sub" : "") +
              (activeId === item.id ? " vault-toc-item--active" : "")
            }
          >
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
