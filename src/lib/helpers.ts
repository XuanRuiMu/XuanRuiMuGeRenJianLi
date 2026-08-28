export function getCurrentTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

export function formatTimeTo12H(date: Date): string {
  // 传入的 Date 已由 getCurrentTimeInTimezone 换算为目标时区的本地时间，
  // 这里直接按本地字段格式化即可，不能再叠加 timeZone 转换
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
}
