"use client";

/**
 * El Voto tweak store (Session 01). A tiny external store backing the five
 * live tweaks, consumed via useSyncExternalStore so there are no
 * setState-in-effect cascades. Persists to localStorage, syncs across tabs via
 * the `storage` event, and keeps the <meta name="theme-color"> in step with
 * the theme. SSR snapshot is always the light defaults; the persisted value is
 * applied on the client after hydration.
 */

import { DEFAULT_MUNICIPIO, P_CEPEDA, PULSO } from "../_lib/demo-data";

export type Accent = "petroleo" | "terracota";
export type Theme = "light" | "dark";

export interface VotoTweaks {
  accent: Accent;
  theme: Theme;
  pCepeda: number;
  pulso: number;
  municipio: string;
}

export const DEFAULTS: VotoTweaks = {
  accent: "petroleo",
  theme: "light",
  pCepeda: P_CEPEDA,
  pulso: PULSO,
  municipio: DEFAULT_MUNICIPIO,
};

const STORAGE_KEY = "voto_tweaks";

let current: VotoTweaks = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setThemeColorMeta(theme: Theme) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = theme === "dark" ? "#0F1216" : "#F7F4EC";
}

function readStored(): VotoTweaks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<VotoTweaks>) };
  } catch {
    /* localStorage blocked */
  }
  return DEFAULTS;
}

/** Read persisted state once on the client; safe to call repeatedly. */
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  current = readStored();
  setThemeColorMeta(current.theme);
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    hydrate();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
  }
  listeners.add(listener);
  // A late subscriber still needs the post-hydration snapshot.
  if (current !== DEFAULTS) listener();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  current = readStored();
  setThemeColorMeta(current.theme);
  emit();
}

export function getSnapshot(): VotoTweaks {
  return current;
}

export function getServerSnapshot(): VotoTweaks {
  return DEFAULTS;
}

export function setTweak<K extends keyof VotoTweaks>(key: K, value: VotoTweaks[K]) {
  current = { ...current, [key]: value };
  hydrated = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  if (key === "theme") setThemeColorMeta(value as Theme);
  emit();
}
