import type { LogEntry } from '../types/logs'

/** Mock Strategy Bot Execution Logs – NIFTY50 strategy, replace with real API/stream in production */
export function getLogsData(): LogEntry[] {
  return [
    { time: '2025-02-12 09:15:32', level: 'INFO', message: 'Strategy started', strategy: 'NIFTY50 Straddle' },
    { time: '2025-02-12 09:15:33', level: 'INFO', message: 'Connected to NSE', strategy: 'NIFTY50 Straddle' },
    { time: '2025-02-12 09:16:01', level: 'INFO', message: 'Signal: BUY – price within range', strategy: 'NIFTY50 Straddle' },
    { time: '2025-02-12 09:16:02', level: 'INFO', message: 'Order placed – NIFTY 25300 CE @ 156.65', strategy: 'NIFTY50 Straddle' },
    { time: '2025-02-12 09:18:45', level: 'INFO', message: 'Order filled', strategy: 'NIFTY50 Straddle' },
    { time: '2025-02-12 09:20:00', level: 'WARN', message: 'Position size near limit', strategy: 'NIFTY50 Straddle' },
  ]
}
