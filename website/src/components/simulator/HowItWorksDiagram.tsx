/**
 * HowItWorksDiagram: three-step static explainer that replaces the
 * looping trailer mp4 on the `/scenario` landing page.
 *
 * Brand discipline:
 *   - Brutalist quant aesthetic. Mono uppercase headings, serif sub-copy.
 *   - 1px hairline borders, no shadows, no rounded corners, terminal
 *     palette only.
 *   - Hand-drawn-feel geometric icons rendered as inline SVG primitives;
 *     no icon library imports.
 *   - Copy is locked verbatim to the V2-01 checkpoint brief. Do not
 *     rephrase.
 *
 * Layout:
 *   - Three columns above the `sm:` breakpoint.
 *   - Stacks vertically below `sm:` so the 375px viewport remains clean.
 *
 * Server component. No client state, no effects, no animation.
 */

interface StepIconProps {
  className?: string;
}

/**
 * Step 1, CALL: four flag silhouettes in a row, evoking the four
 * empty SF slots the user fills in Final Four mode. Square corners,
 * 1px stroke, hand-drawn-feel proportions.
 */
function CallIcon({ className }: StepIconProps) {
  return (
    <svg
      viewBox="0 0 80 32"
      width="80"
      height="32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <rect x="2" y="6" width="14" height="20" />
      <rect x="22" y="6" width="14" height="20" />
      <rect x="42" y="6" width="14" height="20" />
      <rect x="62" y="6" width="14" height="20" />
    </svg>
  );
}

/**
 * Step 2, SUBMIT: a bracketed button glyph mirroring the brutalist
 * `[ See how the model reacts ]` button chrome used across the
 * simulator.
 */
function SubmitIcon({ className }: StepIconProps) {
  return (
    <svg
      viewBox="0 0 80 32"
      width="80"
      height="32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <rect x="2" y="6" width="76" height="20" />
      <path d="M10 12 L10 20 M14 12 L14 20" />
      <path d="M66 12 L66 20 M70 12 L70 20" />
      <path d="M32 16 L48 16 M44 12 L48 16 L44 20" />
    </svg>
  );
}

/**
 * Step 3, COMPARE: a hero-rarity readout with a rarity bar beneath,
 * evoking the post-submit reveal page.
 */
function CompareIcon({ className }: StepIconProps) {
  return (
    <svg
      viewBox="0 0 80 32"
      width="80"
      height="32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <text
        x="40"
        y="14"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="9"
        fill="currentColor"
        stroke="none"
      >
        1 IN N
      </text>
      <rect x="6" y="20" width="68" height="6" />
      <rect x="6" y="20" width="22" height="6" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface Step {
  label: string;
  body: string;
  Icon: (props: StepIconProps) => React.ReactElement;
}

const STEPS: readonly Step[] = [
  {
    label: "[ 1 · CALL ]",
    body: "Pick four teams to reach the semifinals.",
    Icon: CallIcon,
  },
  {
    label: "[ 2 · SUBMIT ]",
    body: "See how rare your call is across 10,000 sims.",
    Icon: SubmitIcon,
  },
  {
    label: "[ 3 · COMPARE ]",
    body: "Submit. Compare your scenario to the model.",
    Icon: CompareIcon,
  },
] as const;

export function HowItWorksDiagram() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="border-t border-[var(--rule)] pt-10 pb-10"
    >
      <h2
        id="how-it-works-heading"
        className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
      >
        How it works
      </h2>

      <ul className="mt-6 grid grid-cols-1 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.Icon;
          return (
            <li
              key={step.label}
              className="flex flex-col gap-4 bg-[var(--bg-root)] p-5"
            >
              <div className="font-mono text-[12px] uppercase tracking-[0.10em] text-[var(--text-primary)]">
                {step.label}
              </div>
              <Icon className="text-[var(--text-tertiary)]" />
              <p className="font-serif text-[15px] leading-[1.45] text-[var(--text-primary)]">
                {step.body}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
