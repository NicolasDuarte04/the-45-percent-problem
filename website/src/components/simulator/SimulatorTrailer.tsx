/**
 * SimulatorTrailer: landing-page trailer embed.
 *
 * Pure HTML5 `<video>`, autoplaying muted on loop with `playsInline` so
 * mobile Safari treats it as inline media rather than promoting it to
 * fullscreen on tap. Bordless and corner-sharp on the simulator canvas
 * (brutalist tone): visually continuous with the dark canvas it sits
 * on, exactly like the editorial-canvas trailer pattern but stripped
 * of the rounded card shell.
 *
 * The poster frame (`/trailer-poster.jpg`) renders before the video
 * decodes so the layout never shifts and there's no black flash on
 * first paint. `aria-hidden` + `tabIndex={-1}` keep the loop out of
 * the focus order: it's ambient, not informational.
 *
 * Server component: no client state or effects, just an HTML element.
 * The browser handles autoplay + loop natively.
 */

interface SimulatorTrailerProps {
  /** Optional override for the video source. Defaults to /trailer.mp4. */
  src?: string;
  /** Optional override for the poster frame. */
  poster?: string;
}

export function SimulatorTrailer({
  src = "/trailer.mp4",
  poster = "/trailer-poster.jpg",
}: SimulatorTrailerProps) {
  return (
    <section
      aria-label="Project trailer"
      className="border-t border-[var(--rule)] pt-10 pb-10"
    >
      <div
        // 16:9 box keeps the layout stable during decode + ensures the
        // video never overflows on narrow viewports. No border, no
        // shadow, no radius: the frame is the canvas itself.
        style={{ aspectRatio: "16 / 9", width: "100%" }}
        className="overflow-hidden"
      >
        <video
          src={src}
          poster={poster}
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
