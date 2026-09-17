/**
 * Robust clipboard write with a synchronous fallback.
 *
 * `navigator.clipboard.writeText` rejects with NotAllowedError when the
 * document doesn't have focus at the moment of the click (devtools open
 * and focused, an extension popup focused, an iframe stealing focus
 * mid-handler). The legacy textarea + `document.execCommand("copy")`
 * path tolerates that, so we try it second.
 *
 * Always resolves; never throws. Returns true on success, false otherwise.
 *
 * Callers should react to the return value (e.g. flip an aria-live
 * label to "copied" / "couldn't copy") rather than relying on the
 * promise rejecting — bare `await navigator.clipboard.writeText(...)`
 * leaks unhandled rejections into the console in React 19 dev mode.
 */
export async function writeClipboardText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback below.
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
