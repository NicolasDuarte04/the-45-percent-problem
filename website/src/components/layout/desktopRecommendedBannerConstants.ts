// Shared constants for the Desktop Recommended Banner. Lives in its own
// non-"use client" module so both the client component (which owns the
// reactive dismiss state) and the server layout (which renders the
// pre-hydrate inline script) can import the same string values. Importing
// these directly from a "use client" module would make them client
// references that resolve to undefined when read as plain strings on the
// server.
export const DESKTOP_BANNER_STORAGE_KEY = "45pct.banner.dismissed";
export const DESKTOP_BANNER_DOM_ID = "desktop-recommended-banner";
