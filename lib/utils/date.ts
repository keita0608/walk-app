// All functions produce/consume JST (UTC+9) time.

export function getJSTNow(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 9 * 3600000);
}

export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayJST(): string {
  return formatDateStr(getJSTNow());
}

export function getYesterdayJST(): string {
  const jst = getJSTNow();
  jst.setDate(jst.getDate() - 1);
  return formatDateStr(jst);
}

// Before 11:30 AM JST
export function isSubmissionAllowed(): boolean {
  const jst = getJSTNow();
  const h = jst.getHours();
  const m = jst.getMinutes();
  return h < 11 || (h === 11 && m < 30);
}

// Number of days from startDate through yesterday (inclusive).
export function getElapsedDays(startDate: string): number {
  const jst = getJSTNow();
  const yesterday = new Date(jst.getFullYear(), jst.getMonth(), jst.getDate() - 1);
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);

  if (yesterday < start) return 0;

  const diffMs = yesterday.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

// Returns all YYYY-MM-DD strings from startDate to yesterday (or endDate if earlier).
export function getDateRange(startDate: string, endDate?: string): string[] {
  const jst = getJSTNow();
  const yesterday = new Date(jst.getFullYear(), jst.getMonth(), jst.getDate() - 1);

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);

  let end = yesterday;
  if (endDate) {
    const [ey, em, ed] = endDate.split('-').map(Number);
    const eDate = new Date(ey, em - 1, ed);
    if (eDate < yesterday) end = eDate;
  }

  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(formatDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function displayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

export function displayDateTime(date: Date): string {
  const jst = new Date(date.getTime() + date.getTimezoneOffset() * 60000 + 9 * 3600000);
  return `${formatDateStr(jst)} ${String(jst.getHours()).padStart(2, '0')}:${String(jst.getMinutes()).padStart(2, '0')}`;
}
