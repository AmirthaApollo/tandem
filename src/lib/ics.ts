import type { CareReminder, RoutineMoment } from "../engine/types";
import { parseDayKey } from "../engine/connectionEngine";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

function nextOccurrence(moment: RoutineMoment): Date {
  const [h, m] = moment.time.split(":").map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0);
    if (moment.days.includes(d.getDay()) && d > now) return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

export function buildICS(routine: RoutineMoment[], care: CareReminder[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tandem//Routine//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const m of routine) {
    const start = nextOccurrence(m);
    const end = new Date(start.getTime() + 30 * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:tandem-routine-${m.id}@tandem.app`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${m.label} (${m.forWhom === "pet" ? "for them" : m.forWhom === "you" ? "for you" : "together"})`),
      `RRULE:FREQ=WEEKLY;BYDAY=${m.days.map((d) => BYDAY[d]).join(",")}`,
      fold(`DESCRIPTION:${m.benefit}`),
      "END:VEVENT",
    );
  }

  for (const c of care) {
    const start = parseDayKey(c.date);
    const end = new Date(start.getTime() + 60 * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:tandem-care-${c.id}@tandem.app`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${c.title}`),
      c.notes ? fold(`DESCRIPTION:${c.notes}`) : "DESCRIPTION:",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}