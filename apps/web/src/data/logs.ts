import type { LogEntry } from '../types/logs'

/** Mock Strategy Bot Execution Logs – replace with real API/stream in production */
export function getLogsData(): LogEntry[] {
  return [
    { time: '2025-02-03 10:15:32', level: 'INFO', message: 'Strategy bot started', strategy: 'BTC-USDT DCA' },
    { time: '2025-02-03 10:15:33', level: 'INFO', message: 'Connected to exchange', strategy: 'BTC-USDT DCA' },
    { time: '2025-02-03 10:16:01', level: 'INFO', message: 'Signal: BUY – price within range', strategy: 'BTC-USDT DCA' },
    { time: '2025-02-03 10:16:02', level: 'INFO', message: 'Order placed – 0.001 BTC @ 67000', strategy: 'BTC-USDT DCA' },
    { time: '2025-02-03 10:18:45', level: 'INFO', message: 'Order filled', strategy: 'BTC-USDT DCA' },
    { time: '2025-02-03 10:20:00', level: 'WARN', message: 'Position size near limit', strategy: 'BTC-USDT DCA' },
  ]
}
