import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface DropcapProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * First-paragraph dropcap. §2.8: first glyph at display-md, floated left
 * four lines deep, --ink. Rendered as a <div> so MDX can nest its own <p>
 * inside without producing invalid <p> inside <p> markup.
 */
export function Dropcap({ children, className, ...rest }: DropcapProps) {
  return (
    <div className={cn("vault-dropcap", className)} {...rest}>
      {children}
    </div>
  );
}
