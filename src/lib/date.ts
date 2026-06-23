// Common date helpers

/** 获取北京时区的年月日 YYYY-MM-DD */
export function getBeijingDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/** 获取北京时区的时分 HH:MM */
export function getBeijingTimeString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(d);
}

/** 获取北京时区的小时（0-23） */
export function getBeijingHour(d: Date = new Date()): number {
  return Number(getBeijingTimeString(d).split(":")[0]);
}

/** 获取北京时区的分钟（0-59） */
export function getBeijingMinute(d: Date = new Date()): number {
  return Number(getBeijingTimeString(d).split(":")[1]);
}

/** 同时返回日期与时间 */
export function formatBeijingDate(d: Date = new Date()): {
  date: string;
  time: string;
  hour: number;
  minute: number;
  weekday: number; // 1=Mon ... 7=Sun
} {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const weekdayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${get("second")}`,
    hour,
    minute,
    weekday: weekdayMap[get("weekday")] ?? 1,
  };
}

/** 兼容旧 API */
export function todayDateString(): string {
  return getBeijingDateString(new Date());
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

/** 今天的北京时间 YYYY-MM-DD */
export function todayInBeijing(): string {
  return getBeijingDateString();
}

/** 把 YYYY-MM-DD 加上指定天数，返回新的 YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
