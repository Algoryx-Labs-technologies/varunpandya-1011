declare module 'lightweight-charts' {
  export interface ChartOptions {
    width?: number
    height?: number
    layout?: {
      background?: { color?: string }
      backgroundColor?: string
      textColor?: string
      fontSize?: number
      fontFamily?: string
    }
    grid?: {
      vertLines?: { color?: string; style?: number; visible?: boolean }
      horzLines?: { color?: string; style?: number; visible?: boolean }
    }
    crosshair?: {
      mode?: number
    }
    rightPriceScale?: {
      visible?: boolean
      borderColor?: string
      scaleMargins?: { top?: number; bottom?: number }
    }
    timeScale?: {
      visible?: boolean
      timeVisible?: boolean
      secondsVisible?: boolean
      borderColor?: string
    }
  }

  export interface SeriesOptionsCommon {
    lineColor?: string
    lineWidth?: number
    lineStyle?: number
    lineType?: number
    pointMarkersVisible?: boolean
    lastValueVisible?: boolean
    priceLineVisible?: boolean
    priceFormat?: {
      type?: 'price' | 'volume'
      precision?: number
      minMove?: number
    }
  }

  export interface CandlestickSeriesOptions extends SeriesOptionsCommon {
    upColor?: string
    downColor?: string
    borderUpColor?: string
    borderDownColor?: string
    wickUpColor?: string
    wickDownColor?: string
  }

  export interface LineSeriesOptions extends SeriesOptionsCommon {
    color?: string
  }

  export interface ISeriesApi<T> {
    setData(data: any[]): void
    updateData(data: any): void
    setMarkers(markers: any[]): void
    createPriceLine(options: {
      price: number
      color?: string
      lineWidth?: number
      lineStyle?: number
      axisLabelVisible?: boolean
      title?: string
    }): any
    removePriceLine(priceLine: any): void
  }

  export interface IChartApi {
    remove(): void
    resize(width: number, height: number, force?: boolean): void
    addCandlestickSeries(options?: CandlestickSeriesOptions): ISeriesApi<'Candlestick'>
    addLineSeries(options?: LineSeriesOptions): ISeriesApi<'Line'>
    addSeries(type: any, options?: any): ISeriesApi<any>
    applyOptions(options: Partial<ChartOptions>): void
    timeScale(): ITimeScaleApi
    priceScale(priceScaleId?: string): IPriceScaleApi
  }

  export interface ITimeScaleApi {
    scrollToPosition(position: number, animated?: boolean): void
    scrollToRealTime(): void
    getVisibleRange(): { from: number; to: number } | null
    setVisibleRange(range: { from: number; to: number }): void
  }

  export interface IPriceScaleApi {
    applyOptions(options: any): void
  }

  export function createChart(container: HTMLElement, options?: ChartOptions): IChartApi
  export type CandlestickSeries = ISeriesApi<'Candlestick'>
  export type LineSeries = ISeriesApi<'Line'>
}

