"use client";

import dynamic from "next/dynamic";
import type { EvaluationMetrics } from "@/lib/data/schemas";

interface ReliabilityDiagramLazyProps {
  bins: EvaluationMetrics["reliability_diagram"];
}

const ReliabilityDiagram = dynamic(
  () =>
    import("./ReliabilityDiagram").then((mod) => ({
      default: mod.ReliabilityDiagram,
    })),
  {
    ssr: false,
    loading: () => <ReliabilityDiagramSkeleton />,
  },
);

export function ReliabilityDiagramLazy({ bins }: ReliabilityDiagramLazyProps) {
  return <ReliabilityDiagram bins={bins} />;
}

function ReliabilityDiagramSkeleton() {
  return (
    <div
      aria-label="Reliability diagram loading"
      role="img"
      className="border rounded"
      style={{
        borderColor: "var(--border-subtle)",
        height: 220,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        className="mono"
        style={{
          position: "absolute",
          top: 8,
          left: 12,
          fontSize: 10,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        Reliability diagram
      </span>
      <span
        className="mono"
        style={{
          position: "absolute",
          bottom: 8,
          left: 12,
          fontSize: 10,
          color: "var(--text-tertiary)",
        }}
      >
        Predicted probability
      </span>
      <span
        className="mono"
        style={{
          position: "absolute",
          top: "50%",
          left: 8,
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "left center",
          fontSize: 10,
          color: "var(--text-tertiary)",
        }}
      >
        Observed frequency
      </span>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 36,
          right: 16,
          top: 24,
          bottom: 32,
          borderLeft: "1px dashed var(--border-subtle)",
          borderBottom: "1px dashed var(--border-subtle)",
        }}
      />
    </div>
  );
}
