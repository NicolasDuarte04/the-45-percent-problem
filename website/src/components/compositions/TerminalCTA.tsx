import Link from "next/link";

export function TerminalCTA() {
  return (
    <div
      style={{
        background: "#141414",
        color: "#F7F4EC",
        border: "1px solid #141414",
        borderRadius: 16,
        padding: "26px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div>
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 400,
            color: "#F7F4EC",
            letterSpacing: "-0.01em",
            margin: "0 0 4px",
          }}
        >
          The quantitative surface lives one click away.
        </h3>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "#A8AFBC",
            maxWidth: "52ch",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          Every number on this page is traceable to a snapshot and a code SHA in
          the Divergence Terminal.
        </p>
      </div>
      <Link
        href="/terminal"
        className="no-underline"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          background: "#F7F4EC",
          color: "#141414",
          padding: "0 16px",
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 6,
          whiteSpace: "nowrap",
        }}
      >
        Open terminal →
      </Link>
    </div>
  );
}
