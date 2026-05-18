import type { ReactNode } from "react";

// Checkpoint 17 (C2): KaTeX CSS is scoped here instead of in
// globals.css. Equations appear only in vault essays, so non-vault
// routes no longer ship the ~25 KB stylesheet.
import "katex/dist/katex.min.css";

/**
 * §8.13: every Vault sub-route reasserts the editorial canvas. The parent
 * (editorial) route group also sets this attribute, but pinning it here
 * makes the Vault's palette explicit and self-contained even if a future
 * layout is added between them.
 */
export default function VaultLayout({ children }: { children: ReactNode }) {
  return <div data-canvas="editorial">{children}</div>;
}
