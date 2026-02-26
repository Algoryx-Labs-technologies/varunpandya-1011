import {
  getProfileApi,
  getRMSLimitApi,
  getHoldingApi,
  getAllHoldingsApi,
  getPositionApi,
  convertPositionApi,
  estimateBrokerageChargesApi,
  calculateMarginApi,
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

/** Mock: Get Trade Book (today's trades) – replace with real API call */
export function getTradeBook(): Promise<{ status: boolean; data: TradeBookItem[] }> {
  return Promise.resolve({
    status: true,
    data: [
      { exchange: 'NSE', producttype: 'DELIVERY', tradingsymbol: 'ITC-EQ', instrumenttype: '', symbolgroup: 'EQ', strikeprice: '-1', optiontype: '', expirydate: '', marketlot: '1', precision: '2', multiplier: '-1', tradevalue: '175.00', transactiontype: 'BUY', fillprice: '175.00', fillsize: '1', orderid: '201020000000095', fillid: '50005750', filltime: '13:27:53' },
      { exchange: 'NSE', producttype: 'INTRADAY', tradingsymbol: 'SBIN-EQ', instrumenttype: '', symbolgroup: 'EQ', strikeprice: '-1', optiontype: '', expirydate: '', marketlot: '1', precision: '2', multiplier: '-1', tradevalue: '-580.00', transactiontype: 'SELL', fillprice: '580.00', fillsize: '1', orderid: '201020000000096', fillid: '50005751', filltime: '14:15:22' },
      { exchange: 'NSE', producttype: 'DELIVERY', tradingsymbol: 'RELIANCE-EQ', instrumenttype: '', symbolgroup: 'EQ', strikeprice: '-1', optiontype: '', expirydate: '', marketlot: '1', precision: '2', multiplier: '-1', tradevalue: '2298.25', transactiontype: 'BUY', fillprice: '2298.25', fillsize: '1', orderid: '201020000000097', fillid: '50005752', filltime: '15:02:10' },
    ],
  })
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

/** Mock: Top Gainers/Losers – replace with POST to gainersLosers API */
export function getGainersLosers(
  datatype: GainersLosersDataType,
  _expirytype: GainersLosersExpiryType
): Promise<GainersLosersResponse> {
  const symbols = ['HDFCBANK25JAN24FUT', 'IEX25JAN24FUT', 'KOTAKBANK25JAN24FUT', 'ICICIGI25JAN24FUT', 'DRREDDY25JAN24FUT', 'TATASTEEL25JAN24FUT', 'OFSS25JAN24FUT', 'INDUSINDBK25JAN24FUT', 'CUB25JAN24FUT', 'GUJGASLTD25JAN24FUT']
  const isGainer = datatype.includes('Gainers')
  const data = symbols.map((tradingSymbol, i) => ({
    tradingSymbol,
    percentChange: isGainer ? 20.02 - i * 1.5 : -(10.5 + i * 0.8),
    symbolToken: 55394 + i,
    opnInterest: Math.floor(118861600 * (0.3 + Math.random() * 0.7)),
    netChangeOpnInterest: Math.floor((isGainer ? 1 : -1) * (1.98e7 - i * 1e6)),
  }))
  return Promise.resolve({ status: true, message: 'SUCCESS', errorcode: '', data })
}

/** Mock: PCR Volume – replace with GET putCallRatio API */
export function getPutCallRatio(): Promise<PCRResponse> {
  const data = [
    { pcr: 1.04, tradingSymbol: 'NIFTY25JAN24FUT' },
    { pcr: 0.58, tradingSymbol: 'HEROMOTOCO25JAN24FUT' },
    { pcr: 0.65, tradingSymbol: 'ADANIPORTS25JAN24FUT' },
    { pcr: 0.92, tradingSymbol: 'BANKNIFTY25JAN24FUT' },
    { pcr: 1.12, tradingSymbol: 'RELIANCE25JAN24FUT' },
    { pcr: 0.78, tradingSymbol: 'TCS25JAN24FUT' },
    { pcr: 0.88, tradingSymbol: 'SBIN25JAN24FUT' },
    { pcr: 1.15, tradingSymbol: 'INFY25JAN24FUT' },
  ]
  return Promise.resolve({ status: true, message: 'SUCCESS', errorcode: '', data })
}

/** Mock: OI Buildup – replace with POST OIBuildup API */
export function getOIBuildup(
  _expirytype: OIBuildupExpiryType,
  _datatype: OIBuildupDataType
): Promise<OIBuildupResponse> {
  const data = [
    { symbolToken: '55424', ltp: '723.8', netChange: '-28.25', percentChange: '-3.76', opnInterest: '24982.5', netChangeOpnInterest: '-76.25', tradingSymbol: 'JINDALSTEL25JAN24FUT' },
    { symbolToken: '55452', ltp: '134.25', netChange: '-5.05', percentChange: '-3.63', opnInterest: '67965.0', netChangeOpnInterest: '-3120.0', tradingSymbol: 'NATIONALUM25JAN24FUT' },
    { symbolToken: '55418', ltp: '892.5', netChange: '-12.4', percentChange: '-1.37', opnInterest: '45210.0', netChangeOpnInterest: '-2100.0', tradingSymbol: 'HINDALCO25JAN24FUT' },
    { symbolToken: '55398', ltp: '245.6', netChange: '4.2', percentChange: '1.74', opnInterest: '125000.0', netChangeOpnInterest: '5200.0', tradingSymbol: 'TATAMOTORS25JAN24FUT' },
    { symbolToken: '55461', ltp: '112.3', netChange: '-2.1', percentChange: '-1.84', opnInterest: '98700.0', netChangeOpnInterest: '-1500.0', tradingSymbol: 'ONGC25JAN24FUT' },
  ]
  return Promise.resolve({ status: true, message: 'SUCCESS', errorcode: '', data })
}
