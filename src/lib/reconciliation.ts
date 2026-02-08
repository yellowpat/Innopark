import { RmaCode, HalfDay } from "@prisma/client";

export type DiscrepancyStatus =
  | "MATCH"
  | "ABSENT_WHEN_PLANNED_PRESENT"
  | "PRESENT_WHEN_PLANNED_ABSENT"
  | "ACTUAL_ONLY"
  | "CODE_MISMATCH";

export interface ReconciliationEntry {
  day: number;
  halfDay: HalfDay;
  plannedCode: RmaCode | null;
  actualCode: RmaCode | null;
  status: DiscrepancyStatus;
}

export interface ReconciliationResult {
  userId: string;
  userName: string;
  year: number;
  month: number;
  center: string;
  entries: ReconciliationEntry[];
  stats: {
    total: number;
    matches: number;
    absentWhenPlannedPresent: number;
    presentWhenPlannedAbsent: number;
    actualOnly: number;
    codeMismatch: number;
  };
}

const PRESENCE_CODES: RmaCode[] = ["X", "O", "M"];
const ABSENCE_CODES: RmaCode[] = ["A", "B", "C", "D", "E", "G"];

function isPresenceCode(code: RmaCode): boolean {
  return PRESENCE_CODES.includes(code);
}

function isAbsenceCode(code: RmaCode): boolean {
  return ABSENCE_CODES.includes(code);
}

export function reconcile(
  plannedEntries: Array<{ day: number; halfDay: HalfDay; code: RmaCode }>,
  actualEntries: Array<{ day: number; halfDay: HalfDay; actualCode: RmaCode }>
): ReconciliationEntry[] {
  const plannedMap = new Map<string, RmaCode>();
  const actualMap = new Map<string, RmaCode>();

  for (const e of plannedEntries) {
    plannedMap.set(`${e.day}-${e.halfDay}`, e.code);
  }
  for (const e of actualEntries) {
    actualMap.set(`${e.day}-${e.halfDay}`, e.actualCode);
  }

  // Collect all unique day-halfDay combinations
  const allKeysArr = Array.from(new Set([...Array.from(plannedMap.keys()), ...Array.from(actualMap.keys())]));
  const entries: ReconciliationEntry[] = [];

  for (const key of allKeysArr) {
    const [dayStr, halfDay] = key.split("-");
    const day = parseInt(dayStr);
    const planned = plannedMap.get(key) || null;
    const actual = actualMap.get(key) || null;

    let status: DiscrepancyStatus;

    if (planned && actual) {
      if (planned === actual) {
        status = "MATCH";
      } else if (isPresenceCode(planned) && isPresenceCode(actual)) {
        status = "CODE_MISMATCH";
      } else if (isAbsenceCode(planned) && isPresenceCode(actual)) {
        status = "PRESENT_WHEN_PLANNED_ABSENT";
      } else if (isPresenceCode(planned) && isAbsenceCode(actual)) {
        status = "ABSENT_WHEN_PLANNED_PRESENT";
      } else {
        status = "CODE_MISMATCH";
      }
    } else if (planned && !actual) {
      if (isPresenceCode(planned)) {
        status = "ABSENT_WHEN_PLANNED_PRESENT";
      } else {
        status = "MATCH"; // Planned absent, no actual = fine
      }
    } else if (!planned && actual) {
      status = "ACTUAL_ONLY";
    } else {
      continue; // Both null, skip
    }

    entries.push({
      day,
      halfDay: halfDay as HalfDay,
      plannedCode: planned,
      actualCode: actual,
      status,
    });
  }

  entries.sort((a, b) => a.day - b.day || (a.halfDay === "AM" ? -1 : 1));
  return entries;
}

export function computeStats(entries: ReconciliationEntry[]) {
  const stats = {
    total: entries.length,
    matches: 0,
    absentWhenPlannedPresent: 0,
    presentWhenPlannedAbsent: 0,
    actualOnly: 0,
    codeMismatch: 0,
  };

  for (const e of entries) {
    switch (e.status) {
      case "MATCH":
        stats.matches++;
        break;
      case "ABSENT_WHEN_PLANNED_PRESENT":
        stats.absentWhenPlannedPresent++;
        break;
      case "PRESENT_WHEN_PLANNED_ABSENT":
        stats.presentWhenPlannedAbsent++;
        break;
      case "ACTUAL_ONLY":
        stats.actualOnly++;
        break;
      case "CODE_MISMATCH":
        stats.codeMismatch++;
        break;
    }
  }

  return stats;
}
