export function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** Financial year last two digits. Apr 2026–Mar 2027 → 26 */
export function fyFromDate(d = new Date()): string {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return String(year).slice(-2);
}

export function formatUlr(tcNumber: string, fy: string, seq: number, kind: "F" | "A" = "F"): string {
  const tc = pad(Number(String(tcNumber).replace(/\D/g, "")), 5);
  return `TC${tc}${fy}${pad(seq, 8)}${kind}`;
}

export function formatQc(labCode: string, fy: string, seq: number): string {
  return `QC-${labCode}-${fy}-${pad(seq, 6)}`;
}

export function amendUlr(finalUlr: string): string {
  if (finalUlr.length !== 18 || !finalUlr.endsWith("F")) {
    throw new Error("Can only amend a final 18-char ULR ending in F");
  }
  return `${finalUlr.slice(0, 17)}A`;
}
