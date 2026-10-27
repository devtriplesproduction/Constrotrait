/**
 * Utility to extract UID and sort job cards/assignments with recent UID first.
 */

export function getJobCardUid(item: any): string | number | null {
  if (!item) return null;

  // If item is a job assignment or grouped assignment
  const je = item.job_entry_tests || item.grouped_tests?.[0];
  if (je) {
    if (je.uid_label != null && je.uid_label !== "") return je.uid_label;
    if (je.job_entries?.uid_label != null && je.job_entries.uid_label !== "") return je.job_entries.uid_label;
    if (je.job_entries?.uid != null) return je.job_entries.uid;
    if (je.uid != null) return je.uid;
  }

  // If item is a job entry test
  if (item.job_entries) {
    if (item.uid_label != null && item.uid_label !== "") return item.uid_label;
    if (item.job_entries.uid_label != null && item.job_entries.uid_label !== "") return item.job_entries.uid_label;
    if (item.job_entries.uid != null) return item.job_entries.uid;
  }

  // Direct properties
  if (item.uid_label != null && item.uid_label !== "") return item.uid_label;
  if (item.uid != null) return item.uid;

  return null;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function extractUidInfo(rawUid: string | number | null): {
  prefix: string;
  num: number;
  monthIdx: number;
} {
  if (rawUid == null) return { prefix: "", num: -1, monthIdx: -1 };

  if (typeof rawUid === "number") {
    return { prefix: "", num: rawUid, monthIdx: -1 };
  }

  const str = String(rawUid).trim();
  if (str === "") return { prefix: "", num: -1, monthIdx: -1 };

  // Pure integer string like "34"
  if (/^\d+$/.test(str)) {
    return { prefix: "", num: parseInt(str, 10), monthIdx: -1 };
  }

  // Month-based UID like "OCT-02" or "OCT-2"
  const monthMatch = str.match(/^([A-Za-z]{3})[-_]?(\d+)$/i);
  if (monthMatch) {
    const month = monthMatch[1].toUpperCase();
    const seq = parseInt(monthMatch[2], 10);
    const mIdx = MONTHS.indexOf(month);
    return { prefix: month, num: seq, monthIdx: mIdx };
  }

  // General format like "UID-34" or "JC-34" or "CMTS-34"
  const generalMatch = str.match(/^(.*?)(\d+)$/);
  if (generalMatch) {
    return {
      prefix: generalMatch[1].toUpperCase(),
      num: parseInt(generalMatch[2], 10),
      monthIdx: -1,
    };
  }

  return { prefix: str.toUpperCase(), num: -1, monthIdx: -1 };
}

/**
 * Comparator function to sort Job Cards / Assignments by UID (recent UID first).
 * Numeric UIDs are sorted descending (e.g., 34, 33, 32...).
 * Month-based UIDs are sorted by month and sequence descending (e.g., NOV-01 before OCT-02).
 * Fallback to natural sort descending, then creation date descending.
 */
export function compareJobCardsByUidRecentFirst(a: any, b: any): number {
  const rawA = getJobCardUid(a);
  const rawB = getJobCardUid(b);

  const infoA = extractUidInfo(rawA);
  const infoB = extractUidInfo(rawB);

  // Both have identifiable numbers
  if (infoA.num !== -1 && infoB.num !== -1) {
    // Both are month-based UIDs
    if (infoA.monthIdx !== -1 && infoB.monthIdx !== -1) {
      if (infoA.monthIdx !== infoB.monthIdx) {
        return infoB.monthIdx - infoA.monthIdx; // Later month first
      }
      return infoB.num - infoA.num; // Higher sequence first
    }

    // Both have the same prefix (e.g. empty prefix for standard NABL numeric UIDs like "34" vs "33")
    if (infoA.prefix === infoB.prefix) {
      if (infoA.num !== infoB.num) {
        return infoB.num - infoA.num; // Higher UID number first
      }
    }
  }

  // If one has numeric UID and the other doesn't
  if (infoA.num !== -1 && infoB.num === -1) return -1;
  if (infoA.num === -1 && infoB.num !== -1) return 1;

  // Fallback to natural sort descending on the UID string
  const strA = rawA != null ? String(rawA) : "";
  const strB = rawB != null ? String(rawB) : "";
  if (strA && strB) {
    const naturalComp = strB.localeCompare(strA, undefined, { numeric: true, sensitivity: "base" });
    if (naturalComp !== 0) return naturalComp;
  } else if (strA) {
    return -1;
  } else if (strB) {
    return 1;
  }

  // Fallback to creation date descending
  const dateA = new Date(
    a?.job_entry_tests?.job_entries?.created_at ||
    a?.grouped_tests?.[0]?.job_entries?.created_at ||
    a?.job_entries?.created_at ||
    a?.created_at ||
    0
  ).getTime();

  const dateB = new Date(
    b?.job_entry_tests?.job_entries?.created_at ||
    b?.grouped_tests?.[0]?.job_entries?.created_at ||
    b?.job_entries?.created_at ||
    b?.created_at ||
    0
  ).getTime();

  return dateB - dateA;
}

/**
 * Determines whether a job card, assignment, or test is NABL accredited or Non-NABL.
 */
export function isNablJob(item: any): boolean {
  if (!item) return false;

  // 1. Direct boolean on item
  if (typeof item.is_nabl === "boolean") {
    return item.is_nabl;
  }

  // 2. Job entries relation on item
  if (typeof item.job_entries?.is_nabl === "boolean") {
    return item.job_entries.is_nabl;
  }

  // 3. Check grouped tests or single/multiple job_entry_tests
  const tests = item.grouped_tests || (item.job_entry_tests ? (Array.isArray(item.job_entry_tests) ? item.job_entry_tests : [item.job_entry_tests]) : []);
  for (const t of tests) {
    if (typeof t?.job_entries?.is_nabl === "boolean") {
      return t.job_entries.is_nabl;
    }
    if (typeof t?.test_master?.is_nabl === "boolean") {
      return t.test_master.is_nabl;
    }
    if (typeof t?.is_nabl === "boolean") {
      return t.is_nabl;
    }
  }

  // 4. Fallback based on UID convention
  const rawUid = getJobCardUid(item);
  const info = extractUidInfo(rawUid);
  // Month-based UID like "OCT-03" or "SEP-02" is Non-NABL
  if (info.monthIdx !== -1) {
    return false;
  }
  // Numeric UID like "34", "33" is NABL
  if (info.num !== -1) {
    return true;
  }

  return false;
}
