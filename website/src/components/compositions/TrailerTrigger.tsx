"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TrailerTriggerProps {
  /**
   * Path to the trailer .mp4 (or .webm). Drop the final asset at
   * /public/assets/trailer.mp4 to use the default.
   */
  src?: string;
  /** Optional poster frame shown before playback starts. */
  poster?: string;
  /** Runtime label shown in the trigger. e.g. "00:45". */
  runtime?: string;
  /** Format tag shown in the trigger. e.g. "4K". */
  format?: string;
  /** Filename surfaced in the command line. */
  filename?: string;
  /** Target audio volume after the fade-in completes. */
  audioTargetVolume?: number;
  /** Fade-in duration for audio, in milliseconds. */
  audioFadeMs?: number;
}

const FADE_TICK_MS = 16;

function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function TrailerTrigger({
  src = "/assets/trailer.mp4",
  poster,
  runtime = "00:45",
  format = "4K",
  filename = "trailer.mov",
  audioTargetVolume = 0.85,
  audioFadeMs = 600,
}: TrailerTriggerProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const openModal = useCallback(() => {
    setElapsed(0);
    setOpen(true);
  }, []);

  // ESC key dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Return-to-execute when trigger area is focused
  useEffect(() => {
    if (open) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "Enter" || e.key === " ") &&
        document.activeElement?.getAttribute("data-trailer-trigger") === "true"
      ) {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openModal]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Audio fade-in + auto-play on open
  useEffect(() => {
    if (!open) {
      if (fadeIntervalRef.current !== null) {
        window.clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      return;
    }
    const v = videoRef.current;
    if (!v) return;

    v.currentTime = 0;
    v.volume = 0;
    v.muted = false;

    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Autoplay with audio may be blocked. Retry muted as graceful fallback.
        v.muted = true;
        v.play().catch(() => {});
      });
    }

    const steps = Math.max(1, Math.round(audioFadeMs / FADE_TICK_MS));
    const stepValue = audioTargetVolume / steps;
    let i = 0;
    fadeIntervalRef.current = window.setInterval(() => {
      i += 1;
      const next = Math.min(audioTargetVolume, stepValue * i);
      if (videoRef.current) videoRef.current.volume = next;
      if (i >= steps && fadeIntervalRef.current !== null) {
        window.clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, FADE_TICK_MS);

    return () => {
      if (fadeIntervalRef.current !== null) {
        window.clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      v.pause();
    };
  }, [open, audioFadeMs, audioTargetVolume]);

  return (
    <>
      {/* ── Trigger ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <button
          type="button"
          data-trailer-trigger="true"
          onClick={openModal}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label={`Play project trailer, ${runtime} runtime`}
          className="mono"
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            letterSpacing: "0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textAlign: "left",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              color: "var(--accent-focus)",
              animation: "trailer-cursor-blink 1.1s steps(2, start) infinite",
            }}
          >
            &gt;
          </span>
          <span style={{ color: "var(--text-secondary)" }}>run {filename}</span>
          <span aria-hidden="true" style={{ color: "var(--text-quiet)" }}>
            &middot;
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>{runtime}</span>
          <span aria-hidden="true" style={{ color: "var(--text-quiet)" }}>
            &middot;
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>{format}</span>
          <span aria-hidden="true" style={{ color: "var(--text-quiet)" }}>
            &middot;
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent-focus)",
              opacity: hover ? 1 : 0.7,
              transition: "opacity 180ms ease",
              transform: "translateY(-1px)",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              height: 1,
              width: hover ? 96 : 0,
              background: "var(--text-tertiary)",
              transition: "width 220ms ease-out",
              marginLeft: 6,
            }}
          />
        </button>
        <span
          aria-hidden="true"
          className="mono"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.04em",
            color: "var(--text-quiet)",
            opacity: hover ? 1 : 0,
            transform: hover ? "translateY(0)" : "translateY(-2px)",
            transition: "opacity 180ms ease, transform 180ms ease",
            paddingLeft: 22,
          }}
        >
          [ press &#9166; or click to execute ]
        </span>
      </div>

      <style jsx global>{`
        @keyframes trailer-cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes trailer-modal-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes trailer-video-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Frameless cinematic modal ─────────────────────────────────── */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Project trailer"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(8, 9, 12, 0.78)",
            backdropFilter: "blur(24px) saturate(115%)",
            WebkitBackdropFilter: "blur(24px) saturate(115%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "trailer-modal-fade 380ms ease-out",
            cursor: "zoom-out",
          }}
        >
          {/* Top-left identifier */}
          <div
            className="mono"
            style={{
              position: "fixed",
              top: 24,
              left: 28,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(238, 232, 221, 0.56)",
              pointerEvents: "none",
            }}
          >
            45analytics &middot; {filename}
          </div>

          {/* Top-right close hint */}
          <div
            className="mono"
            style={{
              position: "fixed",
              top: 24,
              right: 28,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(238, 232, 221, 0.56)",
              pointerEvents: "none",
            }}
          >
            esc to dismiss
          </div>

          {/* The video itself, frameless and letterboxed */}
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            playsInline
            controls={false}
            preload="metadata"
            onClick={(e) => e.stopPropagation()}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (Number.isFinite(v.duration)) setDuration(v.duration);
            }}
            onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
            onEnded={close}
            style={{
              maxWidth: "min(1280px, 92vw)",
              maxHeight: "82vh",
              width: "auto",
              height: "auto",
              display: "block",
              boxShadow: "0 30px 120px rgba(0, 0, 0, 0.55)",
              animation: "trailer-video-rise 420ms ease-out",
              cursor: "default",
            }}
          />

          {/* Bottom-left timecode */}
          <div
            className="mono"
            style={{
              position: "fixed",
              bottom: 24,
              left: 28,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "rgba(238, 232, 221, 0.78)",
              pointerEvents: "none",
            }}
          >
            runtime {formatTimecode(elapsed)} / {duration ? formatTimecode(duration) : runtime}
          </div>

          {/* Bottom-right system tag */}
          <div
            className="mono"
            style={{
              position: "fixed",
              bottom: 24,
              right: 28,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(238, 232, 221, 0.45)",
              pointerEvents: "none",
            }}
          >
            {format} &middot; cinematic playback
          </div>
        </div>
      ) : null}
    </>
  );
}
