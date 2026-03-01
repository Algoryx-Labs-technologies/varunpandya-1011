import {
  getProfileApi,
  getRMSLimitApi,
  getHoldingApi,
  getAllHoldingsApi,
  getPositionApi,
  convertPositionApi,
  estimateBrokerageChargesApi,
  calculateMarginApi,
  getGainersLosersApi,
  getPutCallRatioApi,
  getOIBuildupApi,
  getOrderBookApi,
  getTradeBookApi,
} from '../utils/api'
import type {
  ProfileResponse,
  RMSLimitResponse,
  GetAllHoldingResponse,
  GetPositionResponse,
  PositionConversionRequest,
  PositionConversionResponse,
  BrokerageEstimateResponse,
  BrokerageOrderInput,
  GainersLosersDataType,
  GainersLosersExpiryType,
  GainersLosersResponse,
  PCRResponse,
  OIBuildupDataType,
  OIBuildupExpiryType,
  OIBuildupResponse,
} from '../types/dashboard'
import type { TradeBookItem } from '../types/tradeBook'
import type { OrderBookItem } from '../types/orderBook'

/** Normalize profile data (API may return arrays for exchanges/products) */
function normalizeProfileData(d: { clientcode: string; name: string; email: string; mobileno: string; exchanges: string[] | string; products: string[] | string; lastlogintime: string; brokerid: string }) {
  return {
    clientcode: d.clientcode,
    name: d.name,
    email: d.email,
    mobileno: d.mobileno,
    exchanges: Array.isArray(d.exchanges) ? JSON.stringify(d.exchanges) : d.exchanges,
    products: Array.isArray(d.products) ? JSON.stringify(d.products) : d.products,
    lastlogintime: d.lastlogintime,
    brokerid: d.brokerid,
  }
}

/** Get Profile – real API */
export function getProfile(): Promise<ProfileResponse> {
  return getProfileApi().then((res) => ({
    ...res,
    data: normalizeProfileData(res.data),
  }))
}

/** Get RMS Limit – real API */
export function getRMSLimit(): Promise<RMSLimitResponse> {
  return getRMSLimitApi().then((res) => ({
    ...res,
    data: Object.fromEntries(
      Object.entries(res.data).map(([k, v]) => [k, typeof v === 'string' ? v : String(v)])
    ) as RMSLimitResponse['data'],
  }))
}

/** Get Holding (long-term equity delivery) – real API */
export function getHolding(): Promise<{ status: boolean; message: string; errorcode: string; data: import('../types/dashboard').HoldingItem[] }> {
  return getHoldingApi()
}

/** Get All Holding – real API */
export function getAllHolding(): Promise<GetAllHoldingResponse> {
  return getAllHoldingsApi()
}

/** Normalize position response (API may return array or { net, day }) */
function normalizePositionData(
  data: GetPositionResponse['data'] | any[]
): { net?: any[]; day?: any[] } {
  if (Array.isArray(data)) return { net: data, day: [] }
  if (data && typeof data === 'object' && ('net' in data || 'day' in data)) return data as { net?: any[]; day?: any[] }
  return { net: [], day: [] }
}

/** Get Position (net + day) – real API */
export function getPosition(): Promise<GetPositionResponse> {
  return getPositionApi().then((res) => ({
    ...res,
    data: normalizePositionData(res.data),
  }))
}

/** Convert Position – real API */
export function convertPosition(req: PositionConversionRequest): Promise<PositionConversionResponse> {
  return convertPositionApi({
    ...req,
    symbolname: req.symbolname ?? '',
    instrumenttype: req.instrumenttype ?? '',
    priceden: req.priceden ?? '1',
    pricenum: req.pricenum ?? '1',
    genden: req.genden ?? '1',
    gennum: req.gennum ?? '1',
    precision: req.precision ?? '2',
    multiplier: req.multiplier ?? '-1',
    boardlotsize: req.boardlotsize ?? '1',
    type: req.type,
  })
}

/** Get Trade Book (today's trades) – real API GET /api/order/trade-book */
export function getTradeBook(): Promise<{ status: boolean; message: string; errorcode: string; data: TradeBookItem[] }> {
  return getTradeBookApi()
}

/** Get Order Book – real API GET /api/order/order-book */
export function getOrderBook(): Promise<{ status: boolean; message: string; errorcode: string; data: OrderBookItem[] }> {
  return getOrderBookApi()
}

/** Cumulative P&L by day (for charts) – in real app derive from trade book / positions over time */
export interface DailyPnLPoint {
  date: string
  dailyPnL: number
  cumulativePnL: number
}

export function getCumulativePnLSeries(periodDays: number = 30): DailyPnLPoint[] {
  const points: DailyPnLPoint[] = []
  let cum = 0
  const now = new Date()
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().slice(0, 10)
    const daily = (Math.random() - 0.45) * 800
    cum += daily
    points.push({ date: dayStr, dailyPnL: daily, cumulativePnL: cum })
  }
  return points
}

/** Estimate brokerage – real API */
export function estimateCharges(orders: BrokerageOrderInput[]): Promise<BrokerageEstimateResponse> {
  return estimateBrokerageChargesApi(orders)
}

/** Calculate margin for a basket of positions – real API (max 50 positions) */
export function calculateMargin(positions: {
  exchange: string
  qty: number
  price: number
  productType: string
  token: string
  tradeType: string
  orderType?: string
}[]): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { totalMarginRequired: number; marginComponents: Record<string, number> }
}> {
  return calculateMarginApi(positions)
}

/** Top Gainers/Losers – POST /api/market-data/gainers-losers */
export function getGainersLosers(
  datatype: GainersLosersDataType,
  expirytype: GainersLosersExpiryType
): Promise<GainersLosersResponse> {
  return getGainersLosersApi({ datatype, expirytype })
}

/** PCR Volume – GET /api/market-data/put-call-ratio */
export function getPutCallRatio(): Promise<PCRResponse> {
  return getPutCallRatioApi()
}

/** OI Buildup – POST /api/market-data/oi-buildup */
export function getOIBuildup(
  expirytype: OIBuildupExpiryType,
  datatype: OIBuildupDataType
): Promise<OIBuildupResponse> {
  return getOIBuildupApi({ expirytype, datatype })
}
