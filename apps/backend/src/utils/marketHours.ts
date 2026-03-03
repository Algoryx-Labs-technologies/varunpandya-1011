/**
 * Indian market hours (NSE/BSE) in IST.
 * Live = 9:15 AM - 3:30 PM IST, Monday - Friday.
 * Uses system time converted to IST (UTC+5:30).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function nowInIST(): Date {
  const utc = Date.now();
  return new Date(utc + IST_OFFSET_MS);
}

export interface MarketStatus {
  live: boolean;
  message: string;
  istTime: string;
  nextOpen: string | null;
  nextClose: string | null;
}

export function getMarketStatus(): MarketStatus {
  const ist = nowInIST();
  const day = ist.getUTCDay(); // 0 = Sunday, 1 = Mon, ..., 6 = Sat
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const timeMinutes = hour * 60 + minute;

  // NSE equity/derivatives: 9:15 - 15:30 IST, Mon-Fri
  const marketOpenMinutes = 9 * 60 + 15;   // 9:15
  const marketCloseMinutes = 15 * 60 + 30; // 15:30
  const isWeekday = day >= 1 && day <= 5;
  const isWithinHours = timeMinutes >= marketOpenMinutes && timeMinutes < marketCloseMinutes;

  const live = isWeekday && isWithinHours;

  const formatTime = (h: number, m: number): string => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const istTimeStr = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')} ${formatTime(ist.getUTCHours(), ist.getUTCMinutes())} IST`;

  let nextOpen: string | null = null;
  let nextClose: string | null = null;
  if (isWeekday) {
    if (timeMinutes < marketOpenMinutes) {
      nextOpen = `Today ${formatTime(9, 15)} IST`;
      nextClose = `Today ${formatTime(15, 30)} IST`;
    } else if (timeMinutes < marketCloseMinutes) {
      nextOpen = null;
      nextClose = `Today ${formatTime(15, 30)} IST`;
    } else {
      nextOpen = 'Tomorrow 09:15 IST';
      nextClose = 'Tomorrow 15:30 IST';
    }
  } else {
    nextOpen = 'Mon 09:15 IST';
    nextClose = 'Mon 15:30 IST';
  }

  return {
    live,
    message: live ? 'Market open' : 'Market closed',
    istTime: istTimeStr,
    nextOpen,
    nextClose,
  };
}

