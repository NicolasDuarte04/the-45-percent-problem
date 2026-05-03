/**
 * One-in-N restatement per design v2 §3.2.
 *
 *   count >= 1: "1 in <round(total / count)>"
 *   count == 0: "1 in 10,000+" (floor display; never claim certainty of zero)
 *
 * The number is rendered with thousand-separators using the user's locale.
 */
export function getOneInN(count: number, total: number): string {
  if (count <= 0 || total <= 0) {
    return `1 in ${total.toLocaleString("en-US")}+`;
  }
  const n = Math.max(1, Math.round(total / count));
  return `1 in ${n.toLocaleString("en-US")}`;
}

export function getOneInNSentence(count: number, total: number): string {
  return `${getOneInN(count, total)} simulated tournaments matched your prediction.`;
}
