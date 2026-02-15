/** Mock data for strategy logs bar chart (e.g. signals/executions per segment) – NIFTY50 strategy */
export interface StrategyBarPoint {
  label: string
  callOi: number
  putOi: number
  oiIncrease: number
  oiDecrease: number
}

export function getStrategyLogBarData(): StrategyBarPoint[] {
  return [
    { label: '25100', callOi: 0.4, putOi: 0.85, oiIncrease: 0.2, oiDecrease: 0.1 },
    { label: '25200', callOi: 0.55, putOi: 0.92, oiIncrease: 0.35, oiDecrease: 0.15 },
    { label: '25300', callOi: 0.78, putOi: 1.0, oiIncrease: 0.5, oiDecrease: 0.22 },
    { label: '25400', callOi: 0.88, putOi: 0.72, oiIncrease: 0.45, oiDecrease: 0.18 },
    { label: '25500', callOi: 0.65, putOi: 0.48, oiIncrease: 0.3, oiDecrease: 0.25 },
    { label: '25600', callOi: 0.42, putOi: 0.35, oiIncrease: 0.2, oiDecrease: 0.12 },
  ]
}
