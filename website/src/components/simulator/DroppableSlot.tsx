"use client";

/**
 * Generic droppable slot for the simulator build modes.
 *
 * Renders an empty or filled slot that accepts dragged TeamCode values.
 * The slot highlights when a draggable item hovers over it.
 */

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

interface DroppableSlotProps {
  /** Unique droppable id: must not collide with draggable ids. */
  id: string;
  /** Descriptive label for aria-label. */
  label: string;
  children: ReactNode;
  className?: string;
}

export function DroppableSlot({
  id,
  label,
  children,
  className = "",
}: DroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      className={[
        "transition-colors duration-100",
        isOver ? "ring-1 ring-[var(--accent-focus)] ring-inset" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
