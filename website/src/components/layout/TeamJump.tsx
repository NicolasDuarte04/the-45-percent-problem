"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { COUNTRY_NAMES, type FifaCode } from "@/lib/flags/countries";

/**
 * cp-39 · Global find-a-team control.
 *
 * A compact search affordance promoted into the masthead so a visitor can jump
 * to any team from every page, not only from the /matches fixtures filter. The
 * icon toggles a small popover with one input backed by a datalist of all 48
 * qualifiers. Submitting resolves the text to a FIFA code and routes to that
 * team's progression page (/team/[code]); a secondary action opens the
 * team-filtered fixtures list (/matches?team=...). It reuses the same team
 * roster the rest of the site draws on (COUNTRY_NAMES) rather than standing up
 * a new search index.
 */
export function TeamJump() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // name (lowercased) -> code and code (lowercased) -> code, so either a full
  // country name or its 3-letter code resolves to a route slug.
  const index = useMemo(() => {
    const map = new Map<string, FifaCode>();
    for (const [code, name] of Object.entries(COUNTRY_NAMES) as [
      FifaCode,
      string,
    ][]) {
      map.set(code.toLowerCase(), code);
      map.set(name.toLowerCase(), code);
    }
    return map;
  }, []);

  const teamNames = useMemo(
    () => Object.values(COUNTRY_NAMES).slice().sort(),
    [],
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const resolveCode = (raw: string): FifaCode | null => {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    return index.get(q) ?? null;
  };

  const goToTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const code = resolveCode(query);
    if (code) {
      setOpen(false);
      setQuery("");
      router.push(`/team/${code}`);
    } else if (query.trim()) {
      // No exact team match: hand the raw text to the fixtures filter, which
      // does substring matching on team names.
      setOpen(false);
      router.push(`/matches?team=${encodeURIComponent(query.trim())}`);
    }
  };

  const goToFixtures = () => {
    const trimmed = query.trim();
    setOpen(false);
    router.push(trimmed ? `/matches?team=${encodeURIComponent(trimmed)}` : "/matches");
  };

  return (
    <div
      ref={wrapRef}
      className="relative shrink-0 self-center md:order-6"
      style={{ lineHeight: 0 }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Find a team"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Find a team"
        className="inline-flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          border: "1px solid var(--rule)",
          borderRadius: 4,
          background: "transparent",
          color: "var(--text-tertiary)",
          cursor: "pointer",
        }}
      >
        <Search size={15} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Find a team"
          className="absolute z-50"
          style={{
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(280px, calc(100vw - 32px))",
            background: "var(--bg-panel-elev)",
            border: "1px solid var(--border-default)",
            borderRadius: 6,
            padding: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          <form onSubmit={goToTeam} className="flex flex-col gap-2">
            <label
              htmlFor={`${listId}-input`}
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Find a team
            </label>
            <input
              ref={inputRef}
              id={`${listId}-input`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Brazil, ENG, Croatia&hellip;"
              list={listId}
              autoComplete="off"
              className="text-[13px] rounded px-2.5 py-1.5 w-full"
              style={{
                border: "1px solid var(--border-default)",
                background: "var(--bg-panel)",
                color: "var(--text-primary)",
              }}
            />
            <datalist id={listId}>
              {teamNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="text-[12px] rounded px-2.5 py-1.5"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  background: "var(--text-primary)",
                  color: "var(--bg-root)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Open team page
              </button>
              <button
                type="button"
                onClick={goToFixtures}
                className="text-[12px]"
                style={{
                  fontFamily: "var(--font-sans)",
                  color: "var(--text-tertiary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                See fixtures &rarr;
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
