// Tage als ganze Zahlen (Tage seit 1970 in Ortszeit), wie in der Originalversion.
export function today(now = Date.now()) {
  const offset = new Date(now).getTimezoneOffset() * 60000;
  return Math.floor((now - offset) / 86400000);
}

export function dayToDate(day) {
  const d = new Date(day * 86400000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function isoDate(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
