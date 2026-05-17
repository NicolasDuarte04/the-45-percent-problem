interface PdfEmbedProps {
  /** Absolute or public-relative path to the PDF file. */
  src: string;
  /** Accessible name for the embed frame. */
  title: string;
  /** Viewport height of the embed, in px. Defaults to 820. */
  height?: number;
}

/**
 * §8.7 / §12.8: PDF embed with native <object> rendering and an <iframe>
 * fallback for engines that reject <object>. The <object> element renders
 * the <iframe> only when it cannot display the PDF itself; readers whose
 * browsers reject both are served the download link adjacent to the embed
 * on the framework page, so no nested text fallback is needed inside the
 * iframe (which React would reject as an invalid child anyway).
 */
export function PdfEmbed({ src, title, height = 820 }: PdfEmbedProps) {
  return (
    <object
      data={src}
      type="application/pdf"
      aria-label={title}
      style={{
        width: "100%",
        height,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-panel)",
      }}
    >
      <iframe
        src={src}
        title={title}
        style={{
          width: "100%",
          height,
          border: "0",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-panel)",
        }}
      />
    </object>
  );
}
