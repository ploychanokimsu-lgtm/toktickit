// One date/time format for the whole application (Lab 4, Issue #61).
// Times are shown in the service desk time zone (specification BR-25),
// e.g. "4 Oct 2026, 18:53".

export const DISPLAY_TIME_ZONE = "Asia/Bangkok";

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
});

export function formatDateTime(value: string | Date): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : formatter.format(date);
}
