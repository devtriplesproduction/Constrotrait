const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export function calendarYy(d = new Date()): string {
  return String(d.getFullYear()).slice(-2);
}

export function calendarYear(d = new Date()): number {
  return d.getFullYear();
}

export function monthCode(d = new Date()): string {
  return MONTHS[d.getMonth()];
}

/** Photo rule: TC + 5-digit TC + YY + 9-digit serial + F/A = 19 chars */
export function formatUlr19(tcNumber: string, yy: string, seq: number, kind: "F" | "A" = "F"): string {
  const tc = pad(Number(String(tcNumber).replace(/\D/g, "")), 5);
  return `TC${tc}${yy}${pad(seq, 9)}${kind}`;
}

export function formatReportNo(qrCode: string, year: number, seq: number): string {
  return `CMTS/${qrCode}/${year}/${seq}`;
}

export function formatMonthUid(month: string, seq: number): string {
  return `${month}-${pad(seq, 2)}`;
}

export function amendUlr(finalUlr: string): string {
  if (!finalUlr.endsWith("F")) throw new Error("Can only amend a final ULR ending in F");
  return `${finalUlr.slice(0, -1)}A`;
}
