/**
 * ProductSwitcherCard (Session 01) — one of the two flagship cards on the
 * parent 45 Analytics homepage. The academic card (The 45% Problem) stays cold
 * / graphite via `card-45`; the civic card (El Voto) carries the live petróleo
 * accent. Presentational; copy comes from the parent landing + copy revision.
 */

import { DotPattern } from "@/app/voto21junio/_components/DotPattern";

export interface SwitcherStat {
  readonly k: string;
  readonly v: string;
}

interface ProductSwitcherCardProps {
  /** Section number after the § marker ("1" academic, "2" civic). */
  n: string;
  /** Eyebrow label after "§ N ·" (e.g. "Académico", "Cívico"). */
  label: string;
  status: string;
  titleLead: string;
  titleBold: string;
  titleTail?: string;
  desc: string;
  stats: readonly SwitcherStat[];
  cta: string;
  href: string;
  /** Cold/graphite academic variant (card-45) vs. live petróleo civic. */
  cold?: boolean;
  motifSeed: number;
  motifLive: number;
}

export function ProductSwitcherCard({
  n,
  label,
  status,
  titleLead,
  titleBold,
  titleTail,
  desc,
  stats,
  cta,
  href,
  cold = false,
  motifSeed,
  motifLive,
}: ProductSwitcherCardProps) {
  return (
    <a className={`card pcard${cold ? " card-45" : ""}`} href={href}>
      <DotPattern
        className="motif"
        cols={13}
        rows={13}
        live={motifLive}
        gap={12}
        r={2.4}
        seed={motifSeed}
        mask="radial-gradient(circle at 76% 28%,#000,transparent 70%)"
      />
      <div className="status">{status}</div>
      <div className="eyebrow">
        <span className="sec">§ {n}</span> · {label}
      </div>
      <h2>
        {titleLead} <b>{titleBold}</b>
        {titleTail ? ` ${titleTail}` : ""}
      </h2>
      <p className="desc">{desc}</p>
      <div className="stats">
        {stats.map((s) => (
          <div className="s" key={s.k}>
            <div className="k">{s.k}</div>
            <div className="v">{s.v}</div>
          </div>
        ))}
      </div>
      <span className="enter">
        {cta} <span className="arr">→</span>
      </span>
    </a>
  );
}
