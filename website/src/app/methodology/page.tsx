/**
 * §3 — /methodology alias → /vault/methodology
 * Preserved for SEO link-rot prevention.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default function MethodologyPage() {
  redirect("/vault/methodology");
}
