import type { ReactNode } from "react";

/**
 * §8.13: every Vault sub-route reasserts the editorial canvas. The parent
 * (editorial) route group also sets this attribute, but pinning it here
 * makes the Vault's palette explicit and self-contained even if a future
 * layout is added between them.
 */
export default function VaultLayout({ children }: { children: ReactNode }) {
  return <div data-canvas="editorial">{children}</div>;
}
