import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

function toChartTime(t: string | number): number {
  if (typeof t === 'number') return t
  const d = new Date(t)
  return Math.floor(d.getTime() / 1000)
}

interface Candle {
  time: string | number
  open: number
  high: number
  low: number
  close: number
}

interface Level {
  type?: string
  price: number
  source?: string
  stoploss?: number
  target?: number
}

interface PriceChartProps {
  index: string
  timeframe: string
  candles: Candle[]
  levels?: { serverLevels?: Level[]; manualLevels?: Level[] }
  currentPrice?: number
  height?: number
}

export default function PriceChart({ index, timeframe, candles, levels, currentPrice, height = 400 }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const candleSeriesRef = useRef<unknown>(null)
  const smaSeriesRef = useRef<unknown>(null)
  const priceLinesRef = useRef<unknown[]>([])

  const allLevels: (Level & { source?: string })[] = [
    ...(levels?.serverLevels ?? []).map((l) => ({ ...l, source: 'auto' })),
    ...(levels?.manualLevels ?? []).map((l) => ({ ...l, source: 'manual' })),
  ]

  useEffect(() => {
    if (!chartContainerRef.current || !candles || candles.length === 0) return
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: 'var(--bg-card)' }, textColor: 'var(--text-secondary)' },
      grid: { vertLines: { color: 'var(--v-border-subtle, rgba(255,255,255,0.06))' }, horzLines: { color: 'var(--v-border-subtle, rgba(255,255,255,0.06))' } },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'var(--v-border-subtle, rgba(255,255,255,0.06))' },
      rightPriceScale: { borderColor: 'var(--v-border-subtle, rgba(255,255,255,0.06))', scaleMargins: { top: 0.1, bottom: 0.2 } },
    })
    const candleSeries = chart.addCandlestickSeries({
      upColor: 'var(--accent-green)',
      downColor: 'var(--accent-red)',
      borderDownColor: 'var(--accent-red)',
      borderUpColor: 'var(--accent-green)',
      wickDownColor: 'var(--accent-red)',
      wickUpColor: 'var(--accent-green)',
    })
    const data = candles.map((c) => ({
      time: toChartTime(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }))
    ;(candleSeries as { setData: (d: unknown[]) => void }).setData(data)
    const smaPeriod = 20
    if (data.length >= smaPeriod) {
      const smaData = []
      for (let i = smaPeriod - 1; i < data.length; i++) {
        let sum = 0
        for (let j = 0; j < smaPeriod; j++) sum += data[i - j].close
        smaData.push({ time: data[i].time, value: sum / smaPeriod })
      }
      const smaSeries = chart.addLineSeries({ color: 'var(--v-accent-gold)', lineWidth: 2 })
      ;(smaSeries as { setData: (d: unknown[]) => void }).setData(smaData)
      smaSeriesRef.current = smaSeries
    }
    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      smaSeriesRef.current = null
      priceLinesRef.current = []
    }
  }, [index, timeframe, height])

  useEffect(() => {
    if (!candles || candles.length === 0) return
    const candleSeries = candleSeriesRef.current as { setData: (d: unknown[]) => void } | null
    if (!candleSeries) return
    const data = candles.map((c) => ({
      time: toChartTime(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }))
    candleSeries.setData(data)
    const smaSeries = smaSeriesRef.current as { setData: (d: unknown[]) => void } | null
    const smaPeriod = 20
    if (smaSeries && data.length >= smaPeriod) {
      const smaData = []
      for (let i = smaPeriod - 1; i < data.length; i++) {
        let sum = 0
        for (let j = 0; j < smaPeriod; j++) sum += data[i - j].close
        smaData.push({ time: data[i].time, value: sum / smaPeriod })
      }
      smaSeries.setData(smaData)
    }
  }, [candles])

  useEffect(() => {
    const candleSeries = candleSeriesRef.current as { removePriceLine: (pl: unknown) => void; createPriceLine: (o: unknown) => unknown } | null
    if (!candleSeries || !allLevels.length) return
    priceLinesRef.current.forEach((pl) => candleSeries.removePriceLine(pl))
    priceLinesRef.current = []
    const colors: Record<string, string> = { auto: 'var(--v-accent-gold)', manual: 'var(--accent-blue)' }
    allLevels.forEach((level) => {
      const price = Number(level.price)
      if (!Number.isFinite(price)) return
      const pl = candleSeries.createPriceLine({
        price,
        color: level.source ? colors[level.source] : 'var(--text-muted)',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${level.type ?? ''} ${price}`,
      })
      priceLinesRef.current.push(pl)
    })
  }, [allLevels])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !chartContainerRef.current) return
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth ?? 0 })
    })
    ro.observe(chartContainerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!candles || candles.length === 0) {
    return (
      <div className="price-chart-wrap" style={{ height }}>
        <div className="price-chart-placeholder">
          No candle data for {index} {timeframe}. Start the bot or wait for data.
        </div>
      </div>
    )
  }

  return (
    <div className="price-chart-wrap">
      <div className="price-chart-header">
        <span>{index} · {timeframe}</span>
        {currentPrice != null && <span className="mono">LTP ₹{currentPrice}</span>}
      </div>
      <div ref={chartContainerRef} className="price-chart-container" style={{ height }} />
    </div>
  )
}
