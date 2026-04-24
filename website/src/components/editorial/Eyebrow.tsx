import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function Eyebrow({ children, className, ...rest }: EyebrowProps) {
  return (
    <p className={cn("vault-eyebrow", className)} {...rest}>
      {children}
    </p>
  );
}
