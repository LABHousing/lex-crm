const FIXED_CST_OFFSET_HOURS = 6;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseFixedCstDateTime(value: unknown) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dateTimeMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (dateTimeMatch) {
    const [, yearText, monthText, dayText, hourText = "00", minuteText = "00", secondText = "00"] =
      dateTimeMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);

    const utcMillis = Date.UTC(
      year,
      month - 1,
      day,
      hour + FIXED_CST_OFFSET_HOURS,
      minute,
      second
    );
    const parsed = new Date(utcMillis);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toFixedCstDate(value: string | Date) {
  const source = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(source.getTime())) {
    return null;
  }

  return new Date(source.getTime() - FIXED_CST_OFFSET_HOURS * 60 * 60 * 1000);
}

export function toFixedCstDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const cstDate = toFixedCstDate(value);
  if (!cstDate) {
    return "";
  }

  return `${cstDate.getUTCFullYear()}-${pad(cstDate.getUTCMonth() + 1)}-${pad(
    cstDate.getUTCDate()
  )}T${pad(cstDate.getUTCHours())}:${pad(cstDate.getUTCMinutes())}`;
}

export function formatFixedCstDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const cstDate = toFixedCstDate(value);
  if (!cstDate) {
    return "Not set";
  }

  const month = cstDate.getUTCMonth() + 1;
  const day = cstDate.getUTCDate();
  const year = cstDate.getUTCFullYear();
  const rawHours = cstDate.getUTCHours();
  const minutes = pad(cstDate.getUTCMinutes());
  const hour12 = rawHours % 12 || 12;
  const meridiem = rawHours >= 12 ? "PM" : "AM";

  return `${month}/${day}/${year}, ${hour12}:${minutes} ${meridiem} CST`;
}
