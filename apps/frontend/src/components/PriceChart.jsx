import { useEffect, useRef, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import './PriceChart.css';

const BACKEND_URL = typeof window !== 'undefined' ? window.location.origin : '';

function toChartTime(t) {
  if (typeof t === 'number') return t;
  const d = new Date(t);
  return Math.floor(d.getTime() / 1000);
}

function PriceChart({ index, timeframe, candles, levels, currentPrice, height = 400 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const smaSeriesRef = useRef(null);
  const priceLinesRef = useRef([]);

  const allLevels = [
    ...(levels?.serverLevels || []).map((l) => ({ ...l, source: 'auto' })),
    ...(levels?.manualLevels || []).map((l) => ({ ...l, source: 'manual' })),
  ];

  useEffect(() => {
    if (!chartContainerRef.current || !candles || candles.length === 0) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: 'solid', color: 'var(--bg-card)' }, textColor: 'var(--text-secondary)' },
      grid: { vertLines: { color: 'var(--border-subtle)' }, horzLines: { color: 'var(--border-subtle)' } },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'var(--border-subtle)' },
      rightPriceScale: { borderColor: 'var(--border-subtle)', scaleMargins: { top: 0.1, bottom: 0.2 } },
    });
    const candleSeries = chart.addCandlestickSeries({
      upColor: 'var(--accent-emerald)',
      downColor: 'var(--accent-red)',
      borderDownColor: 'var(--accent-red)',
      borderUpColor: 'var(--accent-emerald)',
      wickDownColor: 'var(--accent-red)',
      wickUpColor: 'var(--accent-emerald)',
    });
    const data = candles.map((c) => ({
      time: toChartTime(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));
    candleSeries.setData(data);
    const smaPeriod = 20;
    if (data.length >= smaPeriod) {
      const smaData = [];
      for (let i = smaPeriod - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < smaPeriod; j++) sum += data[i - j].close;
        smaData.push({ time: data[i].time, value: sum / smaPeriod });
      }
      const smaSeries = chart.addLineSeries({ color: 'var(--accent-gold)', lineWidth: 2 });
      smaSeries.setData(smaData);
      smaSeriesRef.current = smaSeries;
    }
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      smaSeriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [index, timeframe, height]);

  useEffect(() => {
    if (!candles || candles.length === 0) return;
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;
    const data = candles.map((c) => ({
      time: toChartTime(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));
    candleSeries.setData(data);
    const smaPeriod = 20;
    if (smaSeriesRef.current && data.length >= smaPeriod) {
      const smaData = [];
      for (let i = smaPeriod - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < smaPeriod; j++) sum += data[i - j].close;
        smaData.push({ time: data[i].time, value: sum / smaPeriod });
      }
      smaSeriesRef.current.setData(smaData);
    }
  }, [candles]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries || !allLevels.length) return;
    priceLinesRef.current.forEach((pl) => candleSeries.removePriceLine(pl));
    priceLinesRef.current = [];
    const colors = { auto: 'var(--accent-gold)', manual: 'var(--accent-blue)' };
    allLevels.forEach((level) => {
      const price = Number(level.price);
      if (!Number.isFinite(price)) return;
      const pl = candleSeries.createPriceLine({
        price,
        color: colors[level.source] || 'var(--text-muted)',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${level.type || ''} ${price}`,
      });
      priceLinesRef.current.push(pl);
    });
  }, [allLevels]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
    });
    ro.observe(chartContainerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!candles || candles.length === 0) {
    return (
      <div className="price-chart-wrap" style={{ height }}>
        <div className="price-chart-placeholder">
          No candle data for {index} {timeframe}. Start the bot or wait for data.
        </div>
      </div>
    );
  }

  return (
    <div className="price-chart-wrap">
      <div className="price-chart-header">
        <span>{index} · {timeframe}</span>
        {currentPrice != null && <span className="mono">LTP ₹{currentPrice}</span>}
      </div>
      <div ref={chartContainerRef} className="price-chart-container" style={{ height }} />
    </div>
  );
}

export default PriceChart;
