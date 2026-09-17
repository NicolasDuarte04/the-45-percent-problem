/**
 * Canonical band labels and downstream-CP string constants · CP-00 (V3).
 *
 * The 5-band rarity vocabulary itself was locked in Phase D and lives
 * in `getRarityBand.ts`; this file is a re-export plus three new
 * strings introduced in V3. Centralising them here lets CP-04, CP-06,
 * CP-08, and CP-10 reference one source instead of inlining.
 */
import { BAND_LABELS as RARITY_BAND_LABELS } from "@/lib/sim/getRarityBand";

export const BAND_LABELS = RARITY_BAND_LABELS;

/** Row label inserted above WATCH in PredictionAlertConfigurator (CP-10). */
export const RARITY_ROW_LABEL = "RARITY";

/** Toast string fired by the [ Reset ] button in all three modes (CP-04). */
export const RESET_TOAST_MESSAGE = "Cleared.";
export const RESET_TOAST_ACTION_LABEL = "Undo";

/** Inline copy shown inside a Champion's Path stage card after an L (CP-06). */
export const DEAD_PATH_LINE = "Path ends here.";
